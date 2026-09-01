/**
 * AI 提供商管理工具
 *
 * 从数据库读取活跃的 AI 提供商配置，
 * 供 embeddings.ts 中的 callDeepSeek / streamDeepSeek 使用。
 */

import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export type AiProviderConfig = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

const REDIS_KEY = "ai:active-provider";
const REDIS_TTL = 300; // 5分钟缓存

// 进程内内存缓存
let memCache: AiProviderConfig | null | undefined; // undefined = 未初始化
let memCacheTime = 0;
const MEM_TTL = 60_000; // 1分钟

/**
 * 获取当前启用的 AI 提供商（带多级缓存）
 *  - L1：进程内内存（1min）
 *  - L2：Redis（5min）
 *  - L3：数据库
 *  - L4：环境变量
 */
export async function getActiveAiProvider(): Promise<AiProviderConfig | null> {
  // L1：内存缓存
  if (memCache !== undefined && memCacheTime > Date.now() - MEM_TTL) {
    return memCache;
  }

  // L2：Redis 缓存
  const r = redis();
  if (r) {
    try {
      const raw = await r.get(REDIS_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as AiProviderConfig | null;
        memCache = cached;
        memCacheTime = Date.now();
        return cached;
      }
    } catch {
      // Redis 不可用，降级到数据库
    }
  }

  // L3：数据库
  let provider: AiProviderConfig | null = null;
  try {
    const row = await prisma.aiProvider.findFirst({
      where: { isActive: true },
    });
    if (row) {
      provider = {
        id: row.id,
        name: row.name,
        baseUrl: row.baseUrl,
        apiKey: row.apiKey,
        model: row.model,
      };
    }
  } catch {
    // DB 不可用时静默降级
  }

  // L4：环境变量兜底
  if (!provider) {
    const envKey = process.env.DEEPSEEK_API_KEY;
    if (envKey && envKey !== "sk-placeholder") {
      provider = {
        id: "env",
        name: "DeepSeek (环境变量)",
        baseUrl: "https://api.deepseek.com",
        apiKey: envKey,
        model: "deepseek-chat",
      };
    }
  }

  // 回填两级缓存
  memCache = provider;
  memCacheTime = Date.now();

  if (r) {
    try {
      await r.set(REDIS_KEY, JSON.stringify(provider), "EX", REDIS_TTL);
    } catch {
      // Redis 写入失败不影响主流程
    }
  }

  return provider;
}

/**
 * 清除 AI 提供商缓存（管理员切换提供商后调用）
 */
export async function clearAiProviderCache(): Promise<void> {
  memCache = undefined;
  memCacheTime = 0;

  const r = redis();
  if (r) {
    try {
      await r.del(REDIS_KEY);
    } catch {
      // Redis 删除失败不影响主流程
    }
  }
}