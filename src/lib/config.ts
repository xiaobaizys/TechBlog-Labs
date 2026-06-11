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
let cacheVersion: string | null = null;
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
 * 获取所有配置（带缓存）
 */
export async function getAllConfig(): Promise<Record<string, string>> {
  // 检查缓存是否有效
  if (cache && cacheTime > Date.now() - CACHE_TTL) {
    // 快速检查版本
    const version = await getCacheVersion();
    if (version === cacheVersion) {
      return { ...DEFAULTS, ...cache };
    }
  }

  // 从数据库加载
  const rows = await prisma.systemConfig.findMany({
    select: { key: true, value: true },
  });

  const config: Record<string, string> = {};
  let version: string | null = null;

  for (const row of rows) {
    if (row.key === "_cache_version") {
      version = row.value;
    } else {
      config[row.key] = row.value;
    }
  }

  cache = config;
  cacheVersion = version;
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
  cacheVersion = null;
  cacheTime = 0;
}

// ============================================================
// 内部
// ============================================================

async function getCacheVersion(): Promise<string | null> {
  const row = await prisma.systemConfig.findUnique({
    where: { key: "_cache_version" },
    select: { value: true },
  });
  return row?.value ?? null;
}
