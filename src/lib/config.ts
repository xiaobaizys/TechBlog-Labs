import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

// ============================================================
// 默认配置
// ============================================================

const DEFAULTS: Record<string, string> = {
  site_title: "TechBlog Labs",
  site_description: "技术博客与创意实验室",
  seo_keywords: "技术博客,编程,Next.js,React",
  posts_per_page: "9",
  comments_per_page: "20",
  enable_comments: "true",
  enable_likes: "true",
};

// ============================================================
// 多级缓存：内存（per-process）+ Redis（跨进程共享）
// ============================================================

let memCache: Record<string, string> | null = null;
let memCacheTime = 0;
const MEM_CACHE_TTL = 300_000; // 5分钟（个人博客配置变更不频繁）
const REDIS_CACHE_TTL = 600; // 10分钟 Redis TTL
const REDIS_KEY = "config:all";

// ============================================================
// API
// ============================================================

/**
 * 获取单个配置值（带缓存）
 */
export async function getConfig(key: string): Promise<string> {
  const all = await getAllConfig();
  return all[key] ?? DEFAULTS[key] ?? "";
}

/**
 * 获取所有配置（带多级 TTL 缓存）
 *
 *  两级缓存策略：
 *   1. 进程内内存缓存（最快，TTL 5min）
 *   2. Redis 缓存（跨进程共享，TTL 10min）
 *   3. 数据库（最终兜底）
 *
 *  命中任一缓存层即返回，不穿透到下一层。
 *  clearConfigCache() 同时清空内存 + Redis。
 */
export async function getAllConfig(): Promise<Record<string, string>> {
  // L1：内存缓存
  if (memCache && memCacheTime > Date.now() - MEM_CACHE_TTL) {
    return { ...DEFAULTS, ...memCache };
  }

  // L2：Redis 缓存
  const r = redis();
  if (r) {
    try {
      const raw = await r.get(REDIS_KEY);
      if (raw) {
        const redisCache = JSON.parse(raw) as Record<string, string>;
        memCache = redisCache;
        memCacheTime = Date.now();
        return { ...DEFAULTS, ...redisCache };
      }
    } catch {
      // Redis 不可用，降级到数据库
    }
  }

  // L3：数据库
  const rows = await prisma.systemConfig.findMany({
    select: { key: true, value: true },
  });

  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }

  // 回填两级缓存
  memCache = config;
  memCacheTime = Date.now();

  if (r) {
    try {
      await r.set(REDIS_KEY, JSON.stringify(config), "EX", REDIS_CACHE_TTL);
    } catch {
      // Redis 写入失败不影响主流程
    }
  }

  return { ...DEFAULTS, ...config };
}

/**
 * 获取数字类型的配置值
 */
export async function getNumberConfig(key: string, fallback: number = 0): Promise<number> {
  const val = await getConfig(key);
  const num = parseInt(val, 10);
  return isNaN(num) ? fallback : num;
}

/**
 * 获取布尔类型的配置值
 */
export async function getBoolConfig(key: string, fallback: boolean = false): Promise<boolean> {
  const val = await getConfig(key);
  return val === "true" || val === "1";
}

/**
 * 清除配置缓存（在更新配置后调用）
 */
export async function clearConfigCache(): Promise<void> {
  memCache = null;
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
