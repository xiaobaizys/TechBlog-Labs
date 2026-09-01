import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export type HomeBackgroundItem = {
  url: string;
  name: string;
};

const REDIS_KEY = "home-backgrounds:active";
const REDIS_TTL_SECONDS = 600; // 10 分钟
const MEM_CACHE_TTL = 60_000; // 1 分钟（进程内缓存，减少同进程重复查库）

let memCache: HomeBackgroundItem[] | null = null;
let memCacheTime = 0;

/**
 * 获取已启用的首页背景图片（多级缓存）
 *
 * 缓存层级：进程内存（1min）→ Redis（10min）→ 数据库
 * 任意一层命中即返回，Redis/数据库结果会回填上层缓存。
 */
export async function getActiveHomeBackgrounds(): Promise<HomeBackgroundItem[]> {
  // L1：进程内存
  if (memCache && memCacheTime > Date.now() - MEM_CACHE_TTL) {
    return memCache;
  }

  // L2：Redis
  const r = redis();
  if (r) {
    try {
      const raw = await r.get(REDIS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HomeBackgroundItem[];
        memCache = parsed;
        memCacheTime = Date.now();
        return parsed;
      }
    } catch {
      // Redis 异常时降级到数据库
    }
  }

  // L3：数据库
  const rows = await prisma.homeBackground.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { url: true, name: true },
  });

  memCache = rows;
  memCacheTime = Date.now();

  if (r) {
    try {
      await r.set(REDIS_KEY, JSON.stringify(rows), "EX", REDIS_TTL_SECONDS);
    } catch {
      // Redis 写入失败不影响主流程
    }
  }

  return rows;
}

/**
 * 清空首页背景图缓存
 *
 * 在管理后台新增/修改/删除背景图后调用，保证前端立即拿到最新数据。
 */
export async function clearHomeBackgroundsCache(): Promise<void> {
  memCache = null;
  memCacheTime = 0;

  const r = redis();
  if (r) {
    try {
      await r.del(REDIS_KEY);
    } catch {
      // 删除失败时缓存会在 TTL 后自然失效
    }
  }
}
