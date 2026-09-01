import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/stats/trend
 *
 * 返回近 7 天每日访客数与浏览量，用于趋势折线图（公开接口）。
 *
 * 数据源：DailyStats 表（按 date 升序）
 * 缺失的日期补 0，保证图表 X 轴连续。
 */

function getStartOfToday(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export async function GET() {
  try {
    const startOfToday = getStartOfToday();

    // 计算 7 天窗口（含今天）
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    // 查询窗口内的所有 DailyStats
    const startDate = days[0]!;
    const endDate = new Date(days[days.length - 1]!);
    endDate.setDate(endDate.getDate() + 1);

    const rows = await prisma.dailyStats.findMany({
      where: { date: { gte: startDate, lt: endDate } },
      orderBy: { date: "asc" },
    });

    // 用 Map 做日期对齐，缺失补 0
    const map = new Map<string, { visitors: number; pageViews: number }>();
    for (const r of rows) {
      const key = r.date.toISOString().slice(0, 10);
      map.set(key, { visitors: r.visitors, pageViews: r.pageViews });
    }

    const trend = days.map((d) => {
      const key = d.toISOString().slice(0, 10);
      const v = map.get(key) ?? { visitors: 0, pageViews: 0 };
      return {
        date: key,
        visitors: v.visitors,
        pageViews: v.pageViews,
      };
    });

    return NextResponse.json({ success: true, data: trend });
  } catch (error) {
    console.error("[GET /api/admin/stats/trend]", error);
    return NextResponse.json(
      { success: false, message: "获取趋势数据失败" },
      { status: 500 }
    );
  }
}
