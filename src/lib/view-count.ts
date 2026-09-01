import { redis } from "./redis";
import { prisma } from "./prisma";

/**
 * 查看计数缓冲模块
 *
 * 设计：
 *  - 使用 Redis INCR 缓冲浏览量，减少数据库行锁竞争
 *  - 定时批量同步到数据库（每 5 分钟或缓冲达到阈值时）
 *  - Redis 不可用时直接更新数据库（fallback）
 */

const VIEW_COUNT_KEY_PREFIX = "views:";
const SYNC_THRESHOLD = 10; // 缓冲达到 10 次时同步
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 分钟

// 定时同步定时器
let syncTimer: NodeJS.Timeout | null = null;

/**
 * 增加文章浏览量（使用 Redis 缓冲）
 */
export async function incrementViewCount(postId: string): Promise<void> {
  const r = redis();

  if (r) {
    try {
      // 使用 Redis INCR 缓冲
      const key = `${VIEW_COUNT_KEY_PREFIX}${postId}`;
      const count = await r.incr(key);

      // 设置过期时间（24 小时），防止无限增长
      if (count === 1) {
        await r.expire(key, 86400);
      }

      // 达到阈值时同步到数据库
      if (count >= SYNC_THRESHOLD) {
        await syncViewCountToDatabase(postId);
      }

      // 启动定时同步（如果还没有启动）
      startSyncTimer();

      return;
    } catch (error) {
      console.warn("[view-count] Redis 操作失败，回退到直接更新数据库:", error);
    }
  }

  // Redis 不可用时直接更新数据库
  await prisma.post.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
  });
}

/**
 * 同步单个文章的浏览量到数据库
 */
async function syncViewCountToDatabase(postId: string): Promise<void> {
  const r = redis();
  if (!r) return;

  try {
    const key = `${VIEW_COUNT_KEY_PREFIX}${postId}`;
    const count = await r.get(key);

    if (count && parseInt(count) > 0) {
      await prisma.post.update({
        where: { id: postId },
        data: { viewCount: { increment: parseInt(count) } },
      });

      // 清除 Redis 中的计数
      await r.del(key);
    }
  } catch (error) {
    console.error("[view-count] 同步浏览量失败:", error);
  }
}

/**
 * 同步所有缓冲的浏览量到数据库
 */
export async function syncAllViewCounts(): Promise<void> {
  const r = redis();
  if (!r) return;

  try {
    // 获取所有浏览量键
    const keys = await r.keys(`${VIEW_COUNT_KEY_PREFIX}*`);

    for (const key of keys) {
      const postId = key.replace(VIEW_COUNT_KEY_PREFIX, "");
      await syncViewCountToDatabase(postId);
    }
  } catch (error) {
    console.error("[view-count] 批量同步浏览量失败:", error);
  }
}

/**
 * 启动定时同步定时器
 */
function startSyncTimer(): void {
  if (syncTimer) return;

  syncTimer = setInterval(async () => {
    await syncAllViewCounts();
  }, SYNC_INTERVAL_MS);

  // 进程退出时同步所有计数
  process.on("beforeExit", async () => {
    await syncAllViewCounts();
  });
}

/**
 * 停止定时同步定时器
 */
export function stopSyncTimer(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}
