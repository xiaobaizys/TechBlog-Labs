import { redis } from "@/lib/redis";
import { signChallenge, verifyChallengeSignature } from "./generator";

/**
 * Captcha Redis 存储层
 *
 * Key 设计：
 *  - cap:c:{challengeId}     挑战数据（targetX/targetY/path/bumps）  TTL 3 min
 *  - cap:t:{ticket}          通过后的 ticket（一次性的"已通过"凭证） TTL 5 min
 *  - cap:t:{ticket}:idem     ticket 绑定的 identifier（防 ticket 串用） TTL 5 min
 *  - pwd:f:{identifier}      密码错误计数（按 identifier）            TTL 15 min
 *  - cap:v:{challengeId}     同一 challengeId 的验证尝试次数（防爆破） TTL 3 min
 *
 * 设计原则：
 *  - 全程不依赖 Prisma，纯 Redis 读写，O(1)
 *  - 所有 key 都有 TTL，3~15 min，过期自动清理
 *  - Redis 不可用时 fail-open（避免登录直接挂掉），但会拒绝发新 ticket
 */

const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "captcha-dev-secret";

/** 挑战在 Redis 中的存储格式 */
type StoredChallenge = {
  targetX: number;
  targetY: number;
  pieceSize: number;
  bgWidth: number;
  bgHeight: number;
  pathD: string;
  /** HMAC 签名，防篡改 */
  sig: string;
  /** 颁发时间（毫秒） */
  createdAt: number;
};

/** 挑战 TTL：3 分钟（用户要求 1-5 min 范围内） */
export const CHALLENGE_TTL_SEC = 180;
/** Ticket TTL：5 分钟（在 1-5 min 范围内） */
export const TICKET_TTL_SEC = 300;
/** 密码错误计数 TTL：15 分钟 */
export const PWD_FAIL_TTL_SEC = 15 * 60;
/** 同一 challengeId 最多允许尝试次数：5 次（防爆破） */
export const VERIFY_MAX_ATTEMPTS = 5;
/** 密码错误阈值：3 次后要求滑块 */
export const PWD_FAIL_THRESHOLD = 3;

// ============================================================
// 挑战数据
// ============================================================

/** 保存挑战到 Redis（覆盖式） */
export async function saveChallenge(
  challengeId: string,
  data: Omit<StoredChallenge, "sig" | "createdAt">
): Promise<void> {
  const r = redis();
  if (!r) return; // fail-open：Redis 挂了不阻塞，但后续 verify 一定失败
  const sig = signChallenge(challengeId, data.targetX, data.targetY, SECRET);
  const payload: StoredChallenge = { ...data, sig, createdAt: Date.now() };
  await r.set(
    `cap:c:${challengeId}`,
    JSON.stringify(payload),
    "EX",
    CHALLENGE_TTL_SEC
  );
}

/** 读取并校验签名（消费时用） */
export async function loadChallenge(
  challengeId: string
): Promise<StoredChallenge | null> {
  const r = redis();
  if (!r) return null;
  const raw = await r.get(`cap:c:${challengeId}`);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as StoredChallenge;
    if (!verifyChallengeSignature(challengeId, data.targetX, data.targetY, data.sig, SECRET)) {
      // 签名不匹配 → 数据被篡改，丢弃
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** 主动删除挑战（验证失败后用，避免爆破） */
export async function deleteChallenge(challengeId: string): Promise<void> {
  const r = redis();
  if (!r) return;
  await r.del(`cap:c:${challengeId}`);
}

// ============================================================
// 验证尝试次数（防爆破）
// ============================================================

/** 增加并返回当前次数；超过上限返回 -1 */
export async function bumpVerifyAttempts(challengeId: string): Promise<number> {
  const r = redis();
  if (!r) return 0;
  const key = `cap:v:${challengeId}`;
  const count = await r.incr(key);
  if (count === 1) {
    await r.expire(key, CHALLENGE_TTL_SEC);
  }
  return count;
}

// ============================================================
// 通过 ticket
// ============================================================

/** 颁发 ticket（一次性） */
export async function issueTicket(ticket: string, identifier: string): Promise<void> {
  const r = redis();
  if (!r) return;
  await r.set(`cap:t:${ticket}`, "1", "EX", TICKET_TTL_SEC);
  await r.set(`cap:t:${ticket}:idem`, identifier, "EX", TICKET_TTL_SEC);
}

/**
 * 消费 ticket：原子地"读 + 删"，确保只能用一次
 *
 * @returns true 消费成功；false ticket 不存在 / 已用 / identifier 不匹配
 */
export async function consumeTicket(
  ticket: string,
  identifier: string
): Promise<boolean> {
  const r = redis();
  if (!r) return false; // Redis 不可用 → 拒绝消费
  const key = `cap:t:${ticket}`;
  const idemKey = `cap:t:${ticket}:idem`;
  // 用 Lua 脚本保证 读-比-删 的原子性
  const lua = `
    local v = redis.call('GET', KEYS[1])
    local idem = redis.call('GET', KEYS[2])
    if not v or not idem then return 0 end
    if idem ~= ARGV[1] then return 0 end
    redis.call('DEL', KEYS[1])
    redis.call('DEL', KEYS[2])
    return 1
  `;
  try {
    const res = (await r.eval(lua, 2, key, idemKey, identifier)) as number;
    return res === 1;
  } catch {
    return false;
  }
}

// ============================================================
// 密码错误计数
// ============================================================

/** identifier 归一化（trim + lowercase） */
function normalizeIdentifier(id: string): string {
  return id.trim().toLowerCase();
}

/** 获取当前错误次数 */
export async function getPwdFailCount(identifier: string): Promise<number> {
  const r = redis();
  if (!r) return 0;
  const key = `pwd:f:${normalizeIdentifier(identifier)}`;
  const v = await r.get(key);
  return v ? Number(v) : 0;
}

/** 增加错误计数（成功登录调用 reset 清零） */
export async function incPwdFail(identifier: string): Promise<number> {
  const r = redis();
  if (!r) return 0;
  const key = `pwd:f:${normalizeIdentifier(identifier)}`;
  const count = await r.incr(key);
  if (count === 1) {
    await r.expire(key, PWD_FAIL_TTL_SEC);
  }
  return count;
}

/** 重置错误计数（成功登录后） */
export async function resetPwdFail(identifier: string): Promise<void> {
  const r = redis();
  if (!r) return;
  const key = `pwd:f:${normalizeIdentifier(identifier)}`;
  await r.del(key);
}

// ============================================================
// 「首次登录」标记
// ============================================================

/** 标记 TTL：30 天（用户成功登录后置位） */
export const FIRST_LOGIN_TTL_SEC = 30 * 24 * 3600;

/** identifier 维度：是否曾经成功登录过 */
export async function hasLoggedIn(identifier: string): Promise<boolean> {
  const r = redis();
  if (!r) return true; // fail-open：Redis 挂了不强制弹滑块（避免完全不可用）
  const v = await r.get(`auth:seen:${normalizeIdentifier(identifier)}`);
  return v === "1";
}

/** 标记 identifier 已成功登录过（首次登录后调用） */
export async function markLoggedIn(identifier: string): Promise<void> {
  const r = redis();
  if (!r) return;
  await r.set(`auth:seen:${normalizeIdentifier(identifier)}`, "1", "EX", FIRST_LOGIN_TTL_SEC);
}
