import Redis from "ioredis";

/**
 * Redis 客户端单例
 *
 * 设计原则：fail-open
 *  - 连不上 Redis 时不抛错，只打 warn 日志，应用继续运行
 *  - 限流、缓存调用方需自己处理"Redis 不可用"分支
 *  - 单机部署够用（无 Cluster / Sentinel）
 */

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | null | undefined;
  // eslint-disable-next-line no-var
  var __redisReady: boolean | undefined;
}

function createClient(): Redis {
  const client = new Redis(REDIS_URL, {
    // 离线时不无限重试，避免启动时日志爆炸
    maxRetriesPerRequest: 1,
    // 重连退避：1s, 2s, 4s, 8s, ..., 最多 30s
    retryStrategy: (times) => Math.min(times * 1000, 30000),
    // 离线时延迟重连，给开发体验
    enableOfflineQueue: false,
    // 连接超时 3s
    connectTimeout: 3000,
    lazyConnect: true,
  });

  client.on("connect", () => {
    // 一次性连接信息仅 dev 打印，生产日志保持安静
    if (process.env.NODE_ENV !== "production") {
      console.log("[redis] 已连接:", REDIS_URL.replace(/:[^:@]+@/, ":***@"));
    }
    globalThis.__redisReady = true;
  });
  client.on("ready", () => {
    globalThis.__redisReady = true;
  });
  client.on("error", (err) => {
    if (globalThis.__redisReady !== false) {
      console.warn("[redis] 连接异常:", err.message);
    }
    globalThis.__redisReady = false;
  });
  client.on("end", () => {
    globalThis.__redisReady = false;
  });

  // 触发首次连接（lazyConnect: true 时需要显式 connect）
  client.connect().catch(() => {
    // ignore - 错误已在 error 事件里处理
  });

  return client;
}

// 在开发热重载时复用同一个 client，避免连接泄漏
function getClient(): Redis | null {
  if (globalThis.__redisClient !== undefined) return globalThis.__redisClient;
  globalThis.__redisClient = createClient();
  return globalThis.__redisClient;
}

/** 获取 Redis 客户端（可能为 null：环境变量禁用 / 未安装时） */
export function redis(): Redis | null {
  if (process.env.REDIS_DISABLED === "1") return null;
  return getClient();
}

/** 当前 Redis 是否就绪 */
export function isRedisReady(): boolean {
  return Boolean(globalThis.__redisReady);
}
