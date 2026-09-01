import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  runAlertCheck,
  getAlertHistory,
  acknowledgeAlert,
  getAlertRules,
  updateAlertRule,
} from "@/lib/alert-system";

/**
 * GET /api/admin/alerts
 *
 * 获取告警信息：
 * - ?action=check — 运行告警检查
 * - ?action=history — 获取告警历史
 * - ?action=rules — 获取告警规则
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "history";

    switch (action) {
      case "check": {
        const alerts = await runAlertCheck();
        return NextResponse.json({
          success: true,
          alerts,
          count: alerts.length,
        });
      }

      case "history": {
        const limit = parseInt(searchParams.get("limit") || "50", 10);
        const history = getAlertHistory(limit);
        return NextResponse.json({
          success: true,
          history,
          count: history.length,
        });
      }

      case "rules": {
        const rules = getAlertRules();
        return NextResponse.json({
          success: true,
          rules,
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[GET /api/admin/alerts]", error);
    return NextResponse.json(
      { error: "获取告警信息失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/alerts
 *
 * 操作告警：
 * - action=acknowledge — 确认告警
 * - action=update-rule — 更新告警规则
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "acknowledge": {
        const { alertId } = body;
        if (!alertId) {
          return NextResponse.json(
            { error: "Missing alertId" },
            { status: 400 }
          );
        }

        const success = acknowledgeAlert(alertId);
        return NextResponse.json({ success });
      }

      case "update-rule": {
        const { ruleId, updates } = body;
        if (!ruleId || !updates) {
          return NextResponse.json(
            { error: "Missing ruleId or updates" },
            { status: 400 }
          );
        }

        const success = updateAlertRule(ruleId, updates);
        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[POST /api/admin/alerts]", error);
    return NextResponse.json(
      { error: "操作告警失败" },
      { status: 500 }
    );
  }
}
