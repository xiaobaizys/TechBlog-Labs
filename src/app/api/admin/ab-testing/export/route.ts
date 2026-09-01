import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getExperiment, getExperimentStats } from "@/lib/ab-testing";

/**
 * GET /api/admin/ab-testing/export
 *
 * 导出 A/B 测试报告为 CSV 或 JSON。
 *
 * Query:
 *   ?id=experiment-id — 实验 ID
 *   ?format=csv|json — 导出格式（默认 csv）
 */

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const experimentId = searchParams.get("id");
    const format = searchParams.get("format") || "csv";

    if (!experimentId) {
      return NextResponse.json(
        { error: "Missing experiment ID" },
        { status: 400 }
      );
    }

    const experiment = getExperiment(experimentId);
    if (!experiment) {
      return NextResponse.json(
        { error: "Experiment not found" },
        { status: 404 }
      );
    }

    const stats = getExperimentStats(experimentId);

    if (format === "json") {
      return NextResponse.json({
        experiment,
        stats,
        exportedAt: new Date().toISOString(),
      });
    }

    // CSV 格式
    const csvRows: string[] = [];

    // 实验信息
    csvRows.push("实验名称," + experiment.name);
    csvRows.push("实验描述," + (experiment.description || ""));
    csvRows.push("状态," + experiment.status);
    csvRows.push("流量分配," + experiment.trafficAllocation + "%");
    csvRows.push("开始时间," + experiment.startDate);
    if (experiment.endDate) {
      csvRows.push("结束时间," + experiment.endDate);
    }
    csvRows.push("");

    // 变体统计
    csvRows.push("变体统计");
    csvRows.push("变体名称,访客数,转化数,转化率,平均值");

    if (stats) {
      stats.variants.forEach((variant) => {
        csvRows.push(
          [
            variant.name,
            variant.visitors.toString(),
            variant.conversions.toString(),
            variant.conversionRate.toFixed(2) + "%",
            variant.averageValue.toFixed(2),
          ].join(",")
        );
      });

      csvRows.push("");
      csvRows.push("总访客数," + stats.totalVisitors);
      csvRows.push("总转化数," + stats.totalConversions);
      csvRows.push(
        "整体转化率," +
          (stats.totalVisitors > 0
            ? ((stats.totalConversions / stats.totalVisitors) * 100).toFixed(2) + "%"
            : "0%")
      );
      csvRows.push("统计置信度," + stats.confidence + "%");
    }

    csvRows.push("");
    csvRows.push("导出时间," + new Date().toISOString());

    const BOM = "﻿";
    const csvContent = BOM + csvRows.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="AB测试报告_${experiment.name}_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/ab-testing/export]", error);
    return NextResponse.json(
      { error: "导出报告失败" },
      { status: 500 }
    );
  }
}
