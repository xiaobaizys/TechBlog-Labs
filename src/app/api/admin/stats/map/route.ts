import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCache, CACHE_TTL } from "@/lib/advanced-cache";

/**
 * GET /api/admin/stats/map
 *
 * 返回各省份的访客统计，用于地图可视化（公开接口）。
 * 使用 Redis 缓存，减少数据库查询压力。
 *
 * Query:
 *   ?days=30 — 筛选最近 N 天（默认全部）
 *
 * Response:
 *   {
 *     provinces: [{ province: "广东", count: 2341 }, ...],
 *     cities: [{ province: "广东", city: "深圳", count: 1200 }, ...],
 *     summary: { totalVisitors: 10000, provinceCount: 25, cityCount: 120 }
 *   }
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "0", 10);

    // 使用缓存（5 分钟 TTL）
    const cacheKey = `map:${days}`;
    const data = await withCache(cacheKey, () => fetchMapData(days), CACHE_TTL.SHORT);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/admin/stats/map]", error);
    return NextResponse.json(
      { error: "获取访客地图数据失败" },
      { status: 500 }
    );
  }
}

/**
 * 获取地图数据
 */
async function fetchMapData(days: number) {
  // 时间范围过滤
  const dateFilter: Record<string, Date> = {};
  if (days > 0) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    dateFilter.gte = since;
  }

  const whereClause = {
    province: { not: null },
    ...(Object.keys(dateFilter).length > 0
      ? { createdAt: dateFilter }
      : {}),
  };

  // 并行查询
  const [provinceStats, cityStats, totalVisitors, provinceCount, cityCount] =
    await Promise.all([
      // 按省份聚合
      prisma.visit.groupBy({
        by: ["province"],
        _count: { id: true },
        where: whereClause,
        orderBy: { _count: { id: "desc" } },
      }),
      // 按城市聚合（省份+城市）
      prisma.visit.groupBy({
        by: ["province", "city"],
        _count: { id: true },
        where: {
          ...whereClause,
          city: { not: null },
        },
        orderBy: { _count: { id: "desc" } },
        take: 100,
      }),
      // 总访客数（独立 visitorId）
      prisma.visit.findMany({
        where: whereClause,
        select: { visitorId: true },
        distinct: ["visitorId"],
      }),
      // 省份数
      prisma.visit.findMany({
        where: whereClause,
        select: { province: true },
        distinct: ["province"],
      }),
      // 城市数
      prisma.visit.findMany({
        where: {
          ...whereClause,
          city: { not: null },
        },
        select: { city: true },
        distinct: ["city"],
      }),
    ]);

  return {
    provinces: provinceStats
      .filter((s) => s.province && s.province !== "未知")
      .map((s) => ({
        province: s.province!,
        count: s._count.id,
      })),
    cities: cityStats
      .filter((s) => s.city && s.city !== "未知")
      .map((s) => ({
        province: s.province || "未知",
        city: s.city!,
        count: s._count.id,
      })),
    summary: {
      totalVisitors: totalVisitors.length,
      provinceCount: provinceCount.filter((p) => p.province && p.province !== "未知").length,
      cityCount: cityCount.filter((c) => c.city && c.city !== "未知").length,
    },
  };
}
