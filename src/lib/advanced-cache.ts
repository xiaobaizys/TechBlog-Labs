/**
 * 高级 Redis 缓存工具
 *
 * 支持：
 * - 多级 TTL 策略
 * - 缓存预热
 * - 缓存失效
 * - 缓存统计
 * - 分布式锁
 */

import { redis } from "./redis";

// ============================================================
// 类型定义
// ============================================================

interface CacheOptions {
  ttl: number; // 缓存 TTL（秒）
  prefix?: string; // 键前缀
  staleWhileRevalidate?: boolean; // 是否允许返回过期数据
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: string;
}

// ============================================================
// 常量
// ============================================================

const CACHE_PREFIX = "vitalog:";
const STATS_KEY = "vitalog:stats:cache";

// TTL 预设（秒）
export const TTL = {
  REALTIME: 10,        // 实时数据：10 秒
  SHORT: 60,           // 短缓存：1 分钟
  MEDIUM: 300,         // 中缓存：5 分钟
  LONG: 1800,          // 长缓存：30 分钟
  VERY_LONG: 7200,     // 超长缓存：2 小时
  DAY: 86400,          // 一天
} as const;

// 兼容 stats-cache.ts 的别名导出
export const CACHE_TTL = TTL;

// ============================================================
// 核心缓存函数
// ============================================================

/**
 * 获取缓存
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = redis();
  if (!r) return null;

  try {
    const fullKey = CACHE_PREFIX + key;
    const data = await r.get(fullKey);

    if (!data) {
      // 记录 miss
      await recordCacheMiss();
      return null;
    }

    // 记录 hit
    await recordCacheHit();

    return JSON.parse(data) as T;
  } catch (error) {
    console.warn("[Cache] Get error:", error);
    return null;
  }
}

/**
 * 设置缓存
 */
export async function cacheSet(
  key: string,
  value: any,
  ttl: number = TTL.MEDIUM
): Promise<void> {
  const r = redis();
  if (!r) return;

  try {
    const fullKey = CACHE_PREFIX + key;
    const data = JSON.stringify(value);

    if (ttl > 0) {
      await r.set(fullKey, data, "EX", ttl);
    } else {
      await r.set(fullKey, data);
    }
  } catch (error) {
    console.warn("[Cache] Set error:", error);
  }
}

/**
 * 删除缓存
 */
export async function cacheDelete(key: string): Promise<void> {
  const r = redis();
  if (!r) return;

  try {
    const fullKey = CACHE_PREFIX + key;
    await r.del(fullKey);
  } catch (error) {
    console.warn("[Cache] Delete error:", error);
  }
}

/**
 * 按模式删除缓存
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  const r = redis();
  if (!r) return;

  try {
    const fullPattern = CACHE_PREFIX + pattern;
    const keys = await r.keys(fullPattern);

    if (keys.length > 0) {
      await r.del(...keys);
    }
  } catch (error) {
    console.warn("[Cache] Delete pattern error:", error);
  }
}

/**
 * 带缓存的数据获取
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions | number = { ttl: TTL.MEDIUM }
): Promise<T> {
  // 兼容旧 stats-cache.ts 的 withCache(key, fn, ttlNumber) 调用方式
  const opts: CacheOptions = typeof options === "number"
    ? { ttl: options }
    : options;
  const { ttl, prefix = "" } = opts;
  const fullKey = prefix ? `${prefix}:${key}` : key;

  // 尝试从缓存获取
  const cached = await cacheGet<T>(fullKey);
  if (cached !== null) {
    return cached;
  }

  // 缓存未命中，执行查询
  const data = await fetchFn();

  // 异步写入缓存（不阻塞响应）
  cacheSet(fullKey, data, ttl).catch(() => {});

  return data;
}

// ============================================================
// 缓存统计
// ============================================================

async function recordCacheHit(): Promise<void> {
  const r = redis();
  if (!r) return;

  try {
    await r.hincrby(STATS_KEY, "hits", 1);
  } catch {}
}

async function recordCacheMiss(): Promise<void> {
  const r = redis();
  if (!r) return;

  try {
    await r.hincrby(STATS_KEY, "misses", 1);
  } catch {}
}

/**
 * 获取缓存统计
 */
export async function getCacheStats(): Promise<CacheStats> {
  const r = redis();
  if (!r) {
    return { hits: 0, misses: 0, hitRate: 0, totalKeys: 0, memoryUsage: "N/A" };
  }

  try {
    const [stats, keys, info] = await Promise.all([
      r.hgetall(STATS_KEY),
      r.keys(CACHE_PREFIX + "*"),
      r.info("memory"),
    ]);

    const hits = parseInt(stats.hits || "0", 10);
    const misses = parseInt(stats.misses || "0", 10);
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;

    // 解析内存使用
    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    const memoryUsage = memoryMatch ? memoryMatch[1] : "N/A";

    return {
      hits,
      misses,
      hitRate,
      totalKeys: keys.length,
      memoryUsage,
    };
  } catch (error) {
    console.warn("[Cache] Stats error:", error);
    return { hits: 0, misses: 0, hitRate: 0, totalKeys: 0, memoryUsage: "N/A" };
  }
}

/**
 * 重置缓存统计
 */
export async function resetCacheStats(): Promise<void> {
  const r = redis();
  if (!r) return;

  try {
    await r.del(STATS_KEY);
  } catch {}
}

// ============================================================
// 缓存预热
// ============================================================

/**
 * 预热缓存
 */
export async function warmupCache(
  keys: Array<{ key: string; fetchFn: () => Promise<any>; ttl?: number }>
): Promise<void> {
  console.log(`[Cache] Warming up ${keys.length} cache keys...`);

  const promises = keys.map(async ({ key, fetchFn, ttl = TTL.MEDIUM }) => {
    try {
      const data = await fetchFn();
      await cacheSet(key, data, ttl);
    } catch (error) {
      console.warn(`[Cache] Warmup failed for ${key}:`, error);
    }
  });

  await Promise.all(promises);
  console.log("[Cache] Warmup completed");
}

// ============================================================
// 分布式锁
// ============================================================

/**
 * 获取分布式锁
 */
export async function acquireLock(
  key: string,
  ttl: number = 10
): Promise<string | null> {
  const r = redis();
  if (!r) return null;

  const lockKey = `${CACHE_PREFIX}lock:${key}`;
  const lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    const result = await r.set(lockKey, lockValue, "EX", ttl, "NX");
    return result === "OK" ? lockValue : null;
  } catch {
    return null;
  }
}

/**
 * 释放分布式锁
 */
export async function releaseLock(key: string, lockValue: string): Promise<boolean> {
  const r = redis();
  if (!r) return false;

  const lockKey = `${CACHE_PREFIX}lock:${key}`;

  try {
    // 使用 Lua 脚本确保原子性
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await r.eval(script, 1, lockKey, lockValue);
    return result === 1;
  } catch {
    return false;
  }
}

/**
 * 带锁的数据获取
 */
export async function withLock<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: { ttl?: number; retries?: number; retryDelay?: number } = {}
): Promise<T> {
  const { ttl = 10, retries = 3, retryDelay = 100 } = options;

  for (let i = 0; i < retries; i++) {
    const lockValue = await acquireLock(key, ttl);
    if (lockValue) {
      try {
        return await fetchFn();
      } finally {
        await releaseLock(key, lockValue);
      }
    }

    // 等待后重试
    if (i < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  // 最后一次尝试（无锁）
  return fetchFn();
}
