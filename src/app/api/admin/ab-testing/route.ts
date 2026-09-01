import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  getAllExperiments,
  getExperiment,
  createExperiment,
  updateExperimentStatus,
  getExperimentStats,
} from "@/lib/ab-testing";

/**
 * GET /api/admin/ab-testing
 *
 * 获取 A/B 测试信息：
 * - ?action=list — 获取所有实验
 * - ?action=detail&id=xxx — 获取实验详情
 * - ?action=stats&id=xxx — 获取实验统计
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";

    switch (action) {
      case "list": {
        const experiments = getAllExperiments();
        return NextResponse.json({
          success: true,
          experiments,
          count: experiments.length,
        });
      }

      case "detail": {
        const id = searchParams.get("id");
        if (!id) {
          return NextResponse.json(
            { error: "Missing experiment id" },
            { status: 400 }
          );
        }

        const experiment = getExperiment(id);
        if (!experiment) {
          return NextResponse.json(
            { error: "Experiment not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          experiment,
        });
      }

      case "stats": {
        const id = searchParams.get("id");
        if (!id) {
          return NextResponse.json(
            { error: "Missing experiment id" },
            { status: 400 }
          );
        }

        const stats = getExperimentStats(id);
        if (!stats) {
          return NextResponse.json(
            { error: "Experiment not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          stats,
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[GET /api/admin/ab-testing]", error);
    return NextResponse.json(
      { error: "获取 A/B 测试信息失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ab-testing
 *
 * 操作 A/B 测试：
 * - action=create — 创建新实验
 * - action=update-status — 更新实验状态
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const { experiment } = body;
        if (!experiment) {
          return NextResponse.json(
            { error: "Missing experiment data" },
            { status: 400 }
          );
        }

        const created = createExperiment(experiment);
        return NextResponse.json({
          success: true,
          experiment: created,
        });
      }

      case "update-status": {
        const { experimentId, status } = body;
        if (!experimentId || !status) {
          return NextResponse.json(
            { error: "Missing experimentId or status" },
            { status: 400 }
          );
        }

        const success = updateExperimentStatus(experimentId, status);
        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[POST /api/admin/ab-testing]", error);
    return NextResponse.json(
      { error: "操作 A/B 测试失败" },
      { status: 500 }
    );
  }
}
