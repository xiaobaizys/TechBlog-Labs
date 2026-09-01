import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  analyzeAndDecide,
  getCurrentLoad,
  generatePM2Config,
  generateDockerComposeConfig,
  generateKubernetesHPAConfig,
  generateNginxConfig,
} from "@/lib/auto-scaler";

/**
 * GET /api/admin/scaling
 *
 * 获取扩缩容信息和配置：
 * - ?action=status — 当前负载和扩缩容建议
 * - ?action=config&type=pm2 — 生成 PM2 配置
 * - ?action=config&type=docker — 生成 Docker Compose 配置
 * - ?action=config&type=k8s — 生成 Kubernetes HPA 配置
 * - ?action=config&type=nginx — 生成 Nginx 配置
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "status";

    switch (action) {
      case "status": {
        const load = getCurrentLoad();
        const decision = analyzeAndDecide(
          {
            cpu: load.cpu,
            memory: load.memory,
            requestsPerMinute: 0, // 需要从监控系统获取
          },
          1 // 当前实例数
        );

        return NextResponse.json({
          load,
          decision,
          timestamp: new Date().toISOString(),
        });
      }

      case "config": {
        const type = searchParams.get("type") || "pm2";
        const minInstances = parseInt(searchParams.get("min") || "1", 10);
        const maxInstances = parseInt(searchParams.get("max") || "4", 10);

        const config = { minInstances, maxInstances };

        let content = "";
        let filename = "";

        switch (type) {
          case "pm2":
            content = generatePM2Config(config);
            filename = "ecosystem.config.js";
            break;
          case "docker":
            content = generateDockerComposeConfig(config);
            filename = "docker-compose.yml";
            break;
          case "k8s":
            content = generateKubernetesHPAConfig(config);
            filename = "hpa.yaml";
            break;
          case "nginx":
            content = generateNginxConfig(maxInstances);
            filename = "nginx.conf";
            break;
          default:
            return NextResponse.json(
              { error: "Unknown config type" },
              { status: 400 }
            );
        }

        return new NextResponse(content, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[GET /api/admin/scaling]", error);
    return NextResponse.json(
      { error: "获取扩缩容信息失败" },
      { status: 500 }
    );
  }
}
