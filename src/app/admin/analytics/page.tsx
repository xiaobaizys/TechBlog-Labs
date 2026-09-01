import { prisma } from "@/lib/prisma";
import { AnalyticsClient } from "./analytics-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "访客统计",
  description: "生息日志访问量与访客趋势数据看板",
  robots: { index: false, follow: false },
};

export default async function AnalyticsPage() {
  const [todayStats, allStats, trendData, topPages] = await Promise.all([
    prisma.dailyStats.findFirst({
      where: { date: new Date().toISOString().split("T")[0] },
    }),
    prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT "visitorId") as "totalVisitors",
        COUNT(*) as "totalPageViews"
      FROM "Visit"
    `,
    prisma.$queryRaw`
      SELECT date, visitors, "pageViews"
      FROM "DailyStats"
      WHERE date >= CURRENT_DATE - INTERVAL '6 days'
      ORDER BY date ASC
    `,
    prisma.$queryRaw`
      SELECT page, COUNT(*) as views
      FROM "Visit"
      GROUP BY page
      ORDER BY views DESC
      LIMIT 10
    `,
  ]);

  const totalVisitors = (allStats as { totalVisitors: number }[])[0]?.totalVisitors ?? 0;
  const totalPageViews = (allStats as { totalPageViews: number }[])[0]?.totalPageViews ?? 0;
  const todayVisitors = todayStats?.visitors ?? 0;
  const todayPageViews = todayStats?.pageViews ?? 0;

  const trend = (trendData as { date: string; visitors: number; pageViews: number }[]).map((d) => ({
    date: d.date,
    visitors: d.visitors ?? 0,
    pageViews: d.pageViews ?? 0,
  }));

  const topPagesResult = (topPages as { page: string; views: number }[]).map((p) => ({
    page: p.page,
    views: p.views ?? 0,
  }));

  return (
    <AnalyticsClient
      data={{
        totalVisitors,
        totalPageViews,
        todayVisitors,
        todayPageViews,
        trend,
        topPages: topPagesResult,
      }}
    />
  );
}
