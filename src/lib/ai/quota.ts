import { prisma } from "@/lib/prisma";

const ANON_LIMIT = 10;   // 未登录每日限额
const USER_LIMIT = 50;   // 登录用户每日限额

export type QuotaInfo = {
  allowed: boolean;
  remaining: number;
  limit: number;
};

/**
 * 取今日零点（用本地时区？还是 UTC？保持和原来一致用本地）
 */
function todayStart(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/**
 * 检查并原子消耗一次 AI 调用配额
 *
 * 设计要点（修复原版的并发竞态）：
 *  - 之前 `checkQuota` + `consumeQuota` 是两次独立 DB 调用，并发请求能同时
 *    通过 check 一起扣，最后实际 count > limit。
 *  - 现在合并成单条原子 SQL：先 INSERT（首次），然后 `UPDATE … WHERE count < limit
 *    RETURNING count`。如果 update 影响行数为 0，说明超限。
 *  - 失败/异常一律 fail-open（视为 allowed=true），避免影响主流程。
 */
export async function checkAndConsumeQuota(userId?: string): Promise<QuotaInfo> {
  if (!userId) {
    return { allowed: true, remaining: ANON_LIMIT, limit: ANON_LIMIT };
  }

  const limit = USER_LIMIT;
  const today = todayStart();

  try {
    // 1) 确保今日配额记录存在（不影响后续判断）
    await prisma.aIQuota.upsert({
      where: { userId_date: { userId, date: today } },
      update: {},
      create: { userId, date: today, count: 0 },
    });

    // 2) 原子自增 + 限额检查
    //    Prisma 不直接支持 conditional update，用 $queryRaw 更直观且有
    //    明确的"只增 1 次"的语义。
    const result = await prisma.$queryRaw<{ count: number }[]>`
      UPDATE "AIQuota"
      SET "count" = "count" + 1, "updatedAt" = NOW()
      WHERE "userId" = ${userId}
        AND "date" = ${today}
        AND "count" < ${limit}
      RETURNING "count"
    `;

    if (result.length === 0) {
      // 没有可消耗的额度（要么记录不存在【理论不会】要么 count >= limit）
      const current = await prisma.aIQuota.findUnique({
        where: { userId_date: { userId, date: today } },
        select: { count: true },
      });
      const used = current?.count ?? limit;
      return { allowed: false, remaining: Math.max(0, limit - used), limit };
    }

    const newCount = result[0].count;
    return { allowed: true, remaining: Math.max(0, limit - newCount), limit };
  } catch (err) {
    // 任何异常都 fail-open（避免 DB 抖动直接拒绝所有请求）
    console.warn("[quota] fail-open:", (err as Error).message);
    return { allowed: true, remaining: limit, limit };
  }
}

/**
 * 回滚一次配额（AI 调用失败时调用，恢复一次额度）
 *
 * 注意：count 不能 < 0。最小为 0。
 */
export async function refundQuota(userId?: string): Promise<void> {
  if (!userId) return;
  const today = todayStart();
  try {
    await prisma.$executeRaw`
      UPDATE "AIQuota"
      SET "count" = GREATEST("count" - 1, 0), "updatedAt" = NOW()
      WHERE "userId" = ${userId} AND "date" = ${today}
    `;
  } catch (err) {
    console.warn("[quota] refund failed:", (err as Error).message);
  }
}

/**
 * 查询剩余配额（不消耗）
 */
export async function getQuotaRemaining(userId?: string): Promise<number> {
  if (!userId) return ANON_LIMIT;
  const today = todayStart();
  const quota = await prisma.aIQuota.findUnique({
    where: { userId_date: { userId, date: today } },
    select: { count: true },
  });
  return Math.max(0, USER_LIMIT - (quota?.count ?? 0));
}
