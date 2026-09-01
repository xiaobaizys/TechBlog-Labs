/**
 * 应用层缓存（Redis 优先 + Data Cache fallback）
 *
 * 背景：
 *  - unstable_cache 只能在单实例的 Data Cache 中生效，多实例 / 多 worker 下
 *    缓存命中率低
 *  - 业务对「博客列表 / 文章详情 / 热门文章」等的访问量高，应该使用跨实例缓存
 *  - Redis 已接入项目，且客户端是 fail-open 的（不可用时不抛错）
 *
 * 设计：
 *  - 优先使用 Redis
 *  - Redis 不可用时 fallback 到 unstable_cache（Data Cache）
 *  - 提供 revalidateTag 友好的失效语义：
 *    - 写操作完成时调用 invalidateTag(...)
 *    - 同时清理 Redis 中以同 tag 为前缀的键
 *  - 序列化使用 JSON，复杂类型安全
 */

import { unstable_cache, revalidateTag } from "next/cache";
import { redis } from "./redis";

const KEY_PREFIX = "app:";

export type CacheOptions = {
  /** 缓存 key 段，会拼成 app:<parts.join(:)> */
  keyParts: ReadonlyArray<string>;
  /** revalidate 时间（秒） */
  revalidate?: number;
  /** Data Cache tags，用于 revalidateTag 失效 */
  tags?: ReadonlyArray<string>;
  /** 是否绕过 Redis（直读数据库） */
  bypassRedis?: boolean;
};

/**
 * 带缓存的数据获取。
 *
 * 解析顺序：Redis → Data Cache (unstable_cache) → 业务函数
 */
export async function appCache<T>(
  opts: CacheOptions,
  fetcher: () => Promise<T>
): Promise<T> {
  const fullKey = buildKey(opts.keyParts);

  // 1) Redis 命中
  if (!opts.bypassRedis) {
    const hit = await redisGet<T>(fullKey);
    if (hit !== undefined) return hit;
  }

  // 2) Data Cache + fetcher
  // 用 unstable_cache 包装 fetcher，确保在 Redis miss 时仍有进程内 + 持久化 Data Cache 兜底
  const cached = unstable_cache(
    async () => fetcher(),
    [...opts.keyParts],
    {
      revalidate: opts.revalidate ?? 60,
      tags: opts.tags ? [...opts.tags] : undefined,
    }
  );
  const data = await cached();

  // 3) 写回 Redis（异步，不阻塞）
  if (!opts.bypassRedis) {
    void redisSet(fullKey, data, opts.revalidate ?? 60);
  }

  return data;
}

/**
 * 失效缓存
 *
 * 1) 清理 Redis 中匹配的所有 key
 * 2) 调用 revalidateTag 清理 Data Cache
 */
export async function invalidateAppCache(tags: ReadonlyArray<string>): Promise<void> {
  // Redis
  try {
    const r = redis();
    if (r) {
      for (const tag of tags) {
        // 使用 app:tag:<tag>:* 模式删除
        const stream = r.scanStream({ match: `${KEY_PREFIX}tag:${tag}:*`, count: 100 });
        const keys: string[] = [];
        await new Promise<void>((resolve, reject) => {
          stream.on("data", (chunk: string[]) => keys.push(...chunk));
          stream.on("end", () => resolve());
          stream.on("error", (err) => reject(err));
        });
        if (keys.length > 0) {
          // 分批删除，避免 KEYS 单次命令过大
          for (let i = 0; i < keys.length; i += 200) {
            const batch = keys.slice(i, i + 200);
            await r.del(...batch);
          }
        }
      }
    }
  } catch (err) {
    // 清理失败不影响主流程
    if (process.env.NODE_ENV !== "production") {
      console.warn("[app-cache] Redis invalidate failed:", err);
    }
  }

  // Data Cache
  for (const tag of tags) {
    revalidateTag(tag);
  }
}

/**
 * 给定 key 关联一组 tag（用于 Redis 失效时按 tag 范围清理）
 * 写回 Redis 时，把所有关联 tag 拼到 key 命名空间里
 */
export function tagKey(tag: string, key: string): string {
  return `${KEY_PREFIX}tag:${tag}:${key}`;
}

function buildKey(parts: ReadonlyArray<string>): string {
  return `${KEY_PREFIX}${parts.join(":")}`;
}

async function redisGet<T>(fullKey: string): Promise<T | undefined> {
  try {
    const r = redis();
    if (!r) return undefined;
    const raw = await r.get(fullKey);
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

async function redisSet(fullKey: string, value: unknown, ttlSec: number): Promise<void> {
  try {
    const r = redis();
    if (!r) return;
    await r.set(fullKey, JSON.stringify(value), "EX", Math.max(1, ttlSec));
  } catch {
    /* ignore */
  }
}
