import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/stats/rebuild-daily
 *
 * 回填/重建 DailyStats 表，从 Visit 聚合每日访客数与浏览量。
 * 通常由 cron 每日凌晨 00:10 调用一次，处理上一日数据 + 兜底修复历史数据。
 *
 * Body / Query:
 *   ?days=30 — 仅回填最近 N 天（默认 30；最大 365）
 *
 * Auth:
 *   1) 优先读取请求头 x-cron-secret，与 CRON_SECRET 环境变量比对
 *   2) 兜底：要求当前用户是 ADMIN（NextAuth session）
 *   3) 两者都不匹配则返回 401
 *
 * 输出:
 *   { success, updated: number, dateRange: { from, to } }
 */

const MAX_DAYS = 365;

function getStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function verifySecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(provided) && provided === expected;
}

export async function POST(request: NextRequest) {
  // ---------- 权限校验 ----------
  const isCron = verifySecret(request);
  let isAdmin = false;
  if (!isCron) {
    try {
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      isAdmin = session?.user?.role === "ADMIN";
    } catch {
      isAdmin = false;
    }
  }
  if (!isCron && !isAdmin) {
    return NextResponse.json(
      { success: false, message: "未授权" },
      { status: 401 }
    );
  }

  // ---------- 解析范围 ----------
  const { searchParams } = new URL(request.url);
  const rawDays = parseInt(searchParams.get("days") || "30", 10);
  const days =
    Number.isFinite(rawDays) && rawDays > 0
      ? Math.min(rawDays, MAX_DAYS)
      : 30;

  const endDay = getStartOfDay(new Date());
  const startDay = new Date(endDay);
  startDay.setDate(startDay.getDate() - (days - 1));

  // ---------- 聚合 ----------
  // 1) 浏览量：按天 count(*) from Visit
  // 2) 独立访客：按天 count(distinct visitorId)
  // 用 $queryRaw 一次拿完，避免 N+1
  type DailyAgg = {
    day: Date;
    pageviews: bigint | number;
    visitors: bigint | number;
  };
  const rows = await prisma.$queryRaw<DailyAgg[]>`
    SELECT DATE("createdAt") AS day,
           COUNT(*)::int AS pageviews,
           COUNT(DISTINCT "visitorId")::int AS visitors
    FROM "Visit"
    WHERE "createdAt" >= ${startDay} AND "createdAt" < ${new Date(endDay.getTime() + 24 * 60 * 60 * 1000)}
    GROUP BY day
    ORDER BY day
  `;

  // 完整天数（缺数据补 0）
  const map = new Map<string, { pageviews: number; visitors: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(startDay.getTime() + i * 24 * 60 * 60 * 1000);
    map.set(d.toISOString().slice(0, 10), { pageviews: 0, visitors: 0 });
  }
  for (const r of rows) {
    const dayStr =
      r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10);
    map.set(dayStr, {
      pageviews: Number(r.pageviews),
      visitors: Number(r.visitors),
    });
  }

  // ---------- 批量 upsert ----------
  const writes = Array.from(map.entries()).map(([dateStr, { pageviews, visitors }]) =>
    prisma.dailyStats.upsert({
      where: { date: new Date(dateStr) },
      create: { date: new Date(dateStr), visitors, pageViews: pageviews },
      update: { visitors, pageViews: pageviews },
    })
  );

  // 串行执行，避免 PG "too many connections"
  let updated = 0;
  for (const w of writes) {
    await w;
    updated += 1;
  }

  return NextResponse.json({
    success: true,
    updated,
    dateRange: {
      from: startDay.toISOString().slice(0, 10),
      to: endDay.toISOString().slice(0, 10),
    },
    rangeDays: days,
  });
}

// 兼容 GET 调用（如 Vercel Cron GET 触发）
export const GET = POST;
