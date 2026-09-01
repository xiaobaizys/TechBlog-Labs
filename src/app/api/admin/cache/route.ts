import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  getCacheStats,
  resetCacheStats,
  cacheDeletePattern,
} from "@/lib/advanced-cache";
import { redis } from "@/lib/redis";

/**
 * GET /api/admin/cache
 *
 * 获取缓存监控数据：
 * - 命中率统计
 * - 内存使用
 * - 键列表
 */
export async function GET() {
  try {
    await requireAdmin();

    const [stats, keys] = await Promise.all([
      getCacheStats(),
      getCacheKeys(),
    ]);

    return NextResponse.json({
      stats,
      keys,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/admin/cache]", error);
    return NextResponse.json(
      { error: "获取缓存数据失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/cache
 *
 * 缓存操作：
 * - action=reset-stats — 重置统计
 * - action=clear-pattern — 按模式清除缓存
 * - action=clear-all — 清除所有缓存
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { action, pattern } = body;

    switch (action) {
      case "reset-stats":
        await resetCacheStats();
        return NextResponse.json({ success: true, message: "统计已重置" });

      case "clear-pattern":
        if (!pattern) {
          return NextResponse.json(
            { error: "Missing pattern" },
            { status: 400 }
          );
        }
        await cacheDeletePattern(pattern);
        return NextResponse.json({
          success: true,
          message: `已清除匹配 "${pattern}" 的缓存`,
        });

      case "clear-all":
        await cacheDeletePattern("*");
        return NextResponse.json({ success: true, message: "所有缓存已清除" });

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[POST /api/admin/cache]", error);
    return NextResponse.json(
      { error: "缓存操作失败" },
      { status: 500 }
    );
  }
}

/**
 * 获取缓存键列表
 */
async function getCacheKeys(): Promise<Array<{ key: string; ttl: number }>> {
  const r = redis();
  if (!r) return [];

  try {
    const keys = await r.keys("vitalog:*");

    // 过滤掉内部键
    const filteredKeys = keys.filter(
      (key) => !key.includes("lock:") && !key.includes("stats:cache")
    );

    // 获取每个键的 TTL
    const keysWithTtl = await Promise.all(
      filteredKeys.slice(0, 100).map(async (key) => {
        const ttl = await r.ttl(key);
        return {
          key: key.replace("vitalog:", ""),
          ttl,
        };
      })
    );

    return keysWithTtl;
  } catch {
    return [];
  }
}
