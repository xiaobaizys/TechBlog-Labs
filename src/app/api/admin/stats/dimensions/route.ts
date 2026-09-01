import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCache, CACHE_TTL } from "@/lib/advanced-cache";

/**
 * GET /api/admin/stats/dimensions
 *
 * 返回多维度访客统计数据（公开接口）：
 * - 时间维度：按小时、按天分布
 * - 页面维度：热门页面排行
 * - 设备维度：浏览器、操作系统分布
 * - 来源维度：Referer 来源分析
 *
 * 优化点：
 *  - 时间分布改走数据库原生聚合，避免全表拉取到内存
 *  - 日趋势直接读 DailyStats 汇总表（该表专为趋势设计）
 *  - 浏览器/OS 用 SQL CASE WHEN 聚合，减少网络传输与 JS 解析开销
 *
 * Query:
 *   ?days=30 — 筛选最近 N 天（默认 7 天）
 */

const MAX_DAYS = 365;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawDays = parseInt(searchParams.get("days") || "7", 10);
    const days = Number.isFinite(rawDays) && rawDays > 0
      ? Math.min(rawDays, MAX_DAYS)
      : 7;

    // 使用缓存（5 分钟 TTL）
    const cacheKey = `dimensions:${days}`;
    const data = await withCache(cacheKey, () => fetchDimensionsData(days), CACHE_TTL.SHORT);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/admin/stats/dimensions]", error);
    return NextResponse.json(
      { error: "获取统计数据失败" },
      { status: 500 }
    );
  }
}

/**
 * 获取维度统计数据
 */
async function fetchDimensionsData(days: number) {
  // 时间范围
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const sinceForHourly = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 并行查询各维度数据
  const [
    hourlyStats,
    dailyStats,
    pageStats,
    browserStats,
    osStats,
    refererStats,
  ] = await Promise.all([
    // 按小时分布（最近 24 小时）
    getHourlyStats(sinceForHourly),
    // 按天分布（走 DailyStats 汇总表）
    getDailyStats(days),
    // 热门页面
    getPageStats(since),
    // 浏览器分布
    getBrowserStats(since),
    // 操作系统分布
    getOsStats(since),
    // 来源分析
    getRefererStats(since),
  ]);

  return {
    hourly: hourlyStats,
    daily: dailyStats,
    pages: pageStats,
    browsers: browserStats,
    os: osStats,
    referers: refererStats,
  };
}

type HourlyRow = { hour: number; count: bigint | number };

/**
 * 获取最近 24 小时的访问分布（数据库聚合）
 */
async function getHourlyStats(since: Date) {
  const rows = await prisma.$queryRaw<HourlyRow[]>`
    SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour,
           COUNT(*)::int AS count
    FROM "Visit"
    WHERE "createdAt" >= ${since}
    GROUP BY hour
    ORDER BY hour
  `;

  const hourly = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
  for (const row of rows) {
    hourly[row.hour].count = Number(row.count);
  }
  return hourly;
}

type DailyRow = { date: Date; visitors: number; pageViews: number };

/**
 * 获取最近 N 天的访问趋势（直接读 DailyStats 汇总表）
 */
async function getDailyStats(days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const rows = await prisma.dailyStats.findMany({
    where: { date: { gte: startDate } },
    orderBy: { date: "asc" },
    select: { date: true, visitors: true, pageViews: true },
  });

  const dailyMap = new Map<string, { visitors: number; pageViews: number }>();

  // 预填充每一天，保证图表连续
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    dailyMap.set(date.toISOString().slice(0, 10), { visitors: 0, pageViews: 0 });
  }

  for (const row of rows) {
    const dateStr =
      row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10);
    dailyMap.set(dateStr, { visitors: row.visitors, pageViews: row.pageViews });
  }

  return Array.from(dailyMap.entries()).map(([date, { visitors, pageViews }]) => ({
    date,
    visitors,
    pageViews,
    count: pageViews, // 保持旧字段兼容
  }));
}

/**
 * 获取热门页面排行
 */
async function getPageStats(since: Date) {
  const pageStats = await prisma.visit.groupBy({
    by: ["page"],
    _count: { id: true },
    where: { createdAt: { gte: since } },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  return pageStats.map((stat) => ({
    page: stat.page,
    count: stat._count.id,
  }));
}

type DeviceRow = { name: string | null; count: bigint | number };

/**
 * 把可能的 Latin-1 / 乱码字符串还原为 UTF-8
 * 当数据库或连接器返回字节流时常见
 */
function decodeText(value: string | null | undefined): string | null {
  if (value == null) return null;
  // 包含常见乱码特征，且不含合法 UTF-8 多字节字符时，按 latin-1 → utf-8 修复
  if (typeof value === "string" && /[ÃåÆ©è]/.test(value)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BufferCtor: typeof Buffer | undefined = (globalThis as any).Buffer;
      if (BufferCtor) {
        const buf = BufferCtor.from(value, "latin1");
        const decoded = buf.toString("utf-8");
        // 如果能解出明显的中文字符就采用
        if (/[\u4e00-\u9fa5]/.test(decoded)) return decoded;
      }
    } catch {
      /* 忽略 */
    }
  }
  return value;
}


/**
 * 获取浏览器分布（SQL CASE WHEN 聚合）
 */
async function getBrowserStats(since: Date) {
  // 强制客户端编码为 UTF-8，避免 PG 默认 latin-1 解析导致中文乱码
  await prisma.$executeRawUnsafe("SET client_encoding = 'UTF8'");

  const rows = await prisma.$queryRaw<DeviceRow[]>`
    SELECT CASE
      WHEN "userAgent" LIKE '%Chrome%' AND "userAgent" NOT LIKE '%Edg%' THEN 'Chrome'
      WHEN "userAgent" LIKE '%Safari%' AND "userAgent" NOT LIKE '%Chrome%' THEN 'Safari'
      WHEN "userAgent" LIKE '%Firefox%' THEN 'Firefox'
      WHEN "userAgent" LIKE '%Edg%' THEN 'Edge'
      WHEN "userAgent" LIKE '%MSIE%' OR "userAgent" LIKE '%Trident%' THEN 'IE'
      ELSE '其他'
    END AS name,
    COUNT(*)::int AS count
    FROM "Visit"
    WHERE "createdAt" >= ${since}
      AND "userAgent" IS NOT NULL
    GROUP BY name
    ORDER BY count DESC
  `;

  return rows.map((r) => ({ name: decodeText(r.name) ?? "未知", count: Number(r.count) }));
}

/**
 * 获取操作系统分布（SQL CASE WHEN 聚合）
 */
async function getOsStats(since: Date) {
  const rows = await prisma.$queryRaw<DeviceRow[]>`
    SELECT CASE
      WHEN "userAgent" LIKE '%Windows%' THEN 'Windows'
      WHEN "userAgent" LIKE '%Mac OS%' THEN 'macOS'
      WHEN "userAgent" LIKE '%Linux%' THEN 'Linux'
      WHEN "userAgent" LIKE '%Android%' THEN 'Android'
      WHEN "userAgent" LIKE '%iOS%' OR "userAgent" LIKE '%iPhone%' OR "userAgent" LIKE '%iPad%' THEN 'iOS'
      ELSE '其他'
    END AS name,
    COUNT(*)::int AS count
    FROM "Visit"
    WHERE "createdAt" >= ${since}
      AND "userAgent" IS NOT NULL
    GROUP BY name
    ORDER BY count DESC
  `;

  return rows.map((r) => ({ name: decodeText(r.name) ?? "未知", count: Number(r.count) }));
}

/**
 * 获取来源分析
 */
async function getRefererStats(since: Date) {
  const refererStats = await prisma.visit.groupBy({
    by: ["referer"],
    _count: { id: true },
    where: {
      createdAt: { gte: since },
      referer: { not: null },
    },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  return refererStats
    .filter((stat) => stat.referer)
    .map((stat) => {
      let domain = "直接访问";
      try {
        if (stat.referer) {
          const url = new URL(stat.referer);
          domain = url.hostname;
        }
      } catch {
        domain = "其他";
      }

      return {
        referer: domain,
        count: stat._count.id,
      };
    });
}
