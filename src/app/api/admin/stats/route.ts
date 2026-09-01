import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/stats
 *
 * 返回总览数据（公开接口）：
 *   - totalVisitors: 累计独立访客数（Visit 表 visitorId 去重）
 *   - totalPageViews: 累计页面浏览量（Visit 表总数）
 *   - todayVisitors: 今日独立访客数（DailyStats.visitors，回退到 Visit count distinct）
 *   - todayPageViews: 今日页面浏览量（DailyStats.pageViews，回退到 Visit count）
 *
 * 注：Prisma 不支持 distinct + count 直接返回数字，用 groupBy 取行数。
 */

function getStartOfToday(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export async function GET() {
  try {
    const now = new Date();
    const startOfToday = getStartOfToday(now);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    // ---------- 并行查询 ----------
    const [totalPageViews, distinctVisitorsRows, todayStats, todayVisitCount] =
      await Promise.all([
        prisma.visit.count(),
        prisma.visit.groupBy({
          by: ["visitorId"],
          _count: { _all: true },
        }),
        prisma.dailyStats.findUnique({ where: { date: startOfToday } }),
        prisma.visit.count({
          where: { createdAt: { gte: startOfToday, lt: endOfToday } },
        }),
      ]);

    const totalVisitors = distinctVisitorsRows.length;
    const todayVisitors = todayStats?.visitors ?? 0;
    const todayPageViews = todayStats?.pageViews ?? todayVisitCount;

    return NextResponse.json({
      success: true,
      data: {
        totalVisitors,
        totalPageViews,
        todayVisitors,
        todayPageViews,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/stats]", error);
    return NextResponse.json(
      { success: false, message: "获取统计数据失败" },
      { status: 500 }
    );
  }
}
