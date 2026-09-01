import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractIp, getLocation } from "@/lib/ip-location";
import { broadcastNewVisitor } from "@/lib/socket-server";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * 广播新访客数据
 * 优先使用自定义服务器的全局广播函数，降级使用 socket-server 模块
 */
function broadcast(visitorData: {
  province: string;
  city: string;
  page: string;
  timestamp: Date;
}) {
  // 尝试使用自定义服务器的全局广播
  const globalBroadcast = (globalThis as any).__socketBroadcast;
  if (globalBroadcast?.newVisitor) {
    globalBroadcast.newVisitor(visitorData);
    return;
  }

  // 降级使用 socket-server 模块
  broadcastNewVisitor(visitorData);
}

/**
 * POST /api/visit
 *
 * 由前端在浏览器空闲时调用，把 middleware 透传的访问数据写入数据库。
 *
 * Body:
 *   { visitorId, page, referer?, userAgent?, sessionId? }
 *
 * 写入逻辑：
 *  1) Visit 表 append 一条记录（用于页面排行等细粒度分析）
 *  2) DailyStats 表 upsert 当日汇总：
 *      - pageViews 每次访问 +1
 *      - visitors 仅当该 visitorId 当日首次出现时 +1
 *
 * 性能：
 *  - 用 upsert + 条件 increment 避免读后写竞态
 *  - visitorId 当日是否首次出现用 Visit 表 count 判定（命中索引）
 */

const VISITOR_ID_RE = /^[a-f0-9]{1,64}$/;
const PAGE_MAX_LEN = 1000;
const REFERER_MAX_LEN = 500;
const UA_MAX_LEN = 500;

function getStartOfToday(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export const POST = withRateLimit(RATE_LIMITS.interact, async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "请求体不能为空" },
        { status: 400 }
      );
    }

    const { visitorId, page, referer, userAgent, sessionId } = body as {
      visitorId?: string;
      page?: string;
      referer?: string;
      userAgent?: string;
      sessionId?: string;
    };

    // ---------- 参数校验 ----------
    if (!visitorId || !VISITOR_ID_RE.test(visitorId)) {
      return NextResponse.json(
        { success: false, message: "visitorId 非法" },
        { status: 400 }
      );
    }
    if (!page || typeof page !== "string" || page.length > PAGE_MAX_LEN) {
      return NextResponse.json(
        { success: false, message: "page 非法" },
        { status: 400 }
      );
    }

    const cleanReferer =
      typeof referer === "string" ? referer.slice(0, REFERER_MAX_LEN) : null;
    const cleanUA =
      typeof userAgent === "string" ? userAgent.slice(0, UA_MAX_LEN) : null;
    const cleanSessionId =
      typeof sessionId === "string" && sessionId.length <= 100
        ? sessionId
        : null;

    // ---------- 时间窗口 ----------
    const now = new Date();
    const startOfToday = getStartOfToday(now);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    // ---------- 判断该 visitorId 今日是否首次访问 ----------
    // 命中 (visitorId, createdAt) 复合索引，O(log n)
    const todayVisitCount = await prisma.visit.count({
      where: {
        visitorId,
        createdAt: { gte: startOfToday, lt: endOfToday },
      },
    });
    const isNewVisitorToday = todayVisitCount === 0;

    // ---------- 获取 IP 和地理位置 ----------
    const ip = extractIp(request);
    const location = getLocation(ip, request.headers);

    // ---------- 写入 Visit + 更新 DailyStats（并行） ----------
    await Promise.all([
      prisma.visit.create({
        data: {
          visitorId,
          sessionId: cleanSessionId,
          page,
          referer: cleanReferer,
          userAgent: cleanUA,
          ip: ip?.slice(0, 45) || null,
          country: location.country,
          province: location.province,
          city: location.city,
        },
      }),
      prisma.dailyStats.upsert({
        where: { date: startOfToday },
        create: {
          date: startOfToday,
          visitors: isNewVisitorToday ? 1 : 0,
          pageViews: 1,
        },
        update: {
          visitors: { increment: isNewVisitorToday ? 1 : 0 },
          pageViews: { increment: 1 },
        },
      }),
    ]);

    // ---------- 广播新访客数据 ----------
    broadcast({
      province: location.province,
      city: location.city,
      page,
      timestamp: now,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/visit]", error);
    return NextResponse.json(
      { success: false, message: "记录访问失败" },
      { status: 500 }
    );
  }
});
