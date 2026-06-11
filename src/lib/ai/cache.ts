import { redis } from "@/lib/redis";
import { createHash } from "node:crypto";

/**
 * AI 响应缓存（针对非流式接口）
 *
 *  - 适用于 summarize / generate-tags 这类"输入→输出"确定的接口
 *  - 不适用于流式 chat（chunk 不一致，缓存价值低）
 *  - 缓存 key: `aicache:{endpoint}:{sha1(prompt)}`
 *  - 默认 TTL: 24h（用户内容相对稳定）
 *
 *  - 命中时直接返回缓存，节省 GLM 调用
 *  - 失败时 fail-open（Redis 不可用就走正常流程）
 */

const DEFAULT_TTL_SEC = 24 * 60 * 60; // 24h

function hash(s: string): string {
  return createHash("sha1").update(s).digest("hex").slice(0, 16);
}

export function aiCacheKey(endpoint: string, input: string): string {
  return `aicache:${endpoint}:${hash(input)}`;
}

/** 从缓存取 */
export async function getAICache<T>(endpoint: string, input: string): Promise<T | null> {
  const r = redis();
  if (!r) return null;
  try {
    const raw = await r.get(aiCacheKey(endpoint, input));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** 写缓存 */
export async function setAICache(
  endpoint: string,
  input: string,
  value: unknown,
  ttlSec: number = DEFAULT_TTL_SEC
): Promise<void> {
  const r = redis();
  if (!r) return;
  try {
    await r.set(aiCacheKey(endpoint, input), JSON.stringify(value), "EX", ttlSec);
  } catch {
    // ignore
  }
}

