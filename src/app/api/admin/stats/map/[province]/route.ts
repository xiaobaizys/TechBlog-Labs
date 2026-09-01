import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/stats/map/:province
 *
 * 返回指定省份的城市访客统计，用于省份下钻（公开接口）。
 *
 * Query:
 *   ?days=30 — 筛选最近 N 天（默认全部）
 *
 * Response:
 *   {
 *     province: "广东",
 *     cities: [{ city: "深圳", count: 1200 }, { city: "广州", count: 800 }, ...],
 *     summary: { totalVisitors: 2000, cityCount: 15 }
 *   }
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { province: string } }
) {
  try {
    const province = decodeURIComponent(params.province);
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "0", 10);

    // 时间范围过滤
    const dateFilter: Record<string, Date> = {};
    if (days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      dateFilter.gte = since;
    }

    const whereClause = {
      province,
      city: { not: null },
      ...(Object.keys(dateFilter).length > 0
        ? { createdAt: dateFilter }
        : {}),
    };

    // 并行查询
    const [cityStats, totalVisitors, cityCount] = await Promise.all([
      // 按城市聚合
      prisma.visit.groupBy({
        by: ["city"],
        _count: { id: true },
        where: whereClause,
        orderBy: { _count: { id: "desc" } },
      }),
      // 总访客数
      prisma.visit.findMany({
        where: { province, ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}) },
        select: { visitorId: true },
        distinct: ["visitorId"],
      }),
      // 城市数
      prisma.visit.findMany({
        where: whereClause,
        select: { city: true },
        distinct: ["city"],
      }),
    ]);

    return NextResponse.json({
      province,
      cities: cityStats
        .filter((s) => s.city && s.city !== "未知")
        .map((s) => ({
          city: s.city!,
          count: s._count.id,
        })),
      summary: {
        totalVisitors: totalVisitors.length,
        cityCount: cityCount.filter((c) => c.city && c.city !== "未知").length,
      },
    });
  } catch (error) {
    console.error(`[GET /api/admin/stats/map/${params.province}]`, error);
    return NextResponse.json(
      { error: "获取省份城市数据失败" },
      { status: 500 }
    );
  }
}
