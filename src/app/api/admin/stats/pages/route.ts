import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/stats/pages
 *
 * 返回页面访问排行 Top 10（公开接口）。
 *
 * 实现：对 Visit.page 做 groupBy + count，按 count 降序取前 10。
 * 命中 page 字段索引。
 *
 * 可选 query：
 *   - days=7  限定最近 N 天（默认全部）
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days") ?? "0");
    const where =
      days > 0
        ? {
            createdAt: {
              gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
            },
          }
        : {};

    const rows = await prisma.visit.groupBy({
      by: ["page"],
      _count: { _all: true },
      where,
      orderBy: { _count: { page: "desc" } },
      take: 10,
    });

    const data = rows.map((r) => ({
      page: r.page,
      views: r._count._all,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[GET /api/admin/stats/pages]", error);
    return NextResponse.json(
      { success: false, message: "获取页面排行失败" },
      { status: 500 }
    );
  }
}
