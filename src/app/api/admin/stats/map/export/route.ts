import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/stats/map/export
 *
 * 导出访客数据为 CSV 文件（公开接口）。
 *
 * Query:
 *   ?days=30 — 筛选最近 N 天（默认全部）
 *   ?type=provinces — 导出类型：provinces（省份汇总）| cities（城市汇总）| raw（原始数据）
 *
 * Response: CSV 文件下载
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "0", 10);
    const type = searchParams.get("type") || "provinces";

    // 时间范围过滤
    const dateFilter: Record<string, Date> = {};
    if (days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      dateFilter.gte = since;
    }

    const whereClause = Object.keys(dateFilter).length > 0
      ? { createdAt: dateFilter }
      : {};

    let csvContent = "";
    let filename = "";

    if (type === "raw") {
      // 导出原始访问数据
      const visits = await prisma.visit.findMany({
        where: whereClause,
        select: {
          visitorId: true,
          page: true,
          ip: true,
          country: true,
          province: true,
          city: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10000, // 限制最多 10000 条
      });

      csvContent = [
        "访客ID,页面,IP,国家,省份,城市,访问时间",
        ...visits.map((v) =>
          [
            v.visitorId,
            `"${v.page}"`,
            v.ip || "",
            v.country || "",
            v.province || "",
            v.city || "",
            v.createdAt.toISOString(),
          ].join(",")
        ),
      ].join("\n");
      filename = "访客原始数据";
    } else if (type === "cities") {
      // 导出城市汇总
      const cityStats = await prisma.visit.groupBy({
        by: ["province", "city"],
        _count: { id: true },
        where: {
          ...whereClause,
          province: { not: null },
          city: { not: null },
        },
        orderBy: { _count: { id: "desc" } },
      });

      csvContent = [
        "省份,城市,访客数",
        ...cityStats
          .filter((s) => s.province && s.city)
          .map((s) => `${s.province},${s.city},${s._count.id}`),
      ].join("\n");
      filename = "城市访客统计";
    } else {
      // 导出省份汇总（默认）
      const provinceStats = await prisma.visit.groupBy({
        by: ["province"],
        _count: { id: true },
        where: {
          ...whereClause,
          province: { not: null },
        },
        orderBy: { _count: { id: "desc" } },
      });

      csvContent = [
        "省份,访客数",
        ...provinceStats
          .filter((s) => s.province)
          .map((s) => `${s.province},${s._count.id}`),
      ].join("\n");
      filename = "省份访客统计";
    }

    // 添加 BOM 以确保 Excel 正确识别中文
    const BOM = "﻿";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const dateStr = new Date().toISOString().slice(0, 10);

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}_${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/stats/map/export]", error);
    return NextResponse.json(
      { error: "导出数据失败" },
      { status: 500 }
    );
  }
}
