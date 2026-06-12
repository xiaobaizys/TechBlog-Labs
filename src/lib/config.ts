import { prisma } from "@/lib/prisma";

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
// 内存缓存
// ============================================================

let cache: Record<string, string> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60秒缓存

// ============================================================
// API
// ============================================================

/**
 * 获取单个配置值（带缓存）
 *
 * @example
 * const title = await getConfig("site_title");      // → "TechBlog Labs"
 * const perPage = await getConfig("posts_per_page"); // → "9"
 */
export async function getConfig(key: string): Promise<string> {
  const all = await getAllConfig();
  return all[key] ?? DEFAULTS[key] ?? "";
}

/**
 * 获取所有配置（带 TTL 缓存）
 *
 * 简化版本：不依赖版本号检查，仅基于时间过期。
 * 60 秒 TTL 对于个人博客完全足够，省去每次缓存命中时的额外查询。
 */
export async function getAllConfig(): Promise<Record<string, string>> {
  if (cache && cacheTime > Date.now() - CACHE_TTL) {
    return { ...DEFAULTS, ...cache };
  }

  const rows = await prisma.systemConfig.findMany({
    select: { key: true, value: true },
  });

  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }

  cache = config;
  cacheTime = Date.now();

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
export function clearConfigCache(): void {
  cache = null;
  cacheTime = 0;
}
