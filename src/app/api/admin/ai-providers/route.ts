import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/ai-providers — 列出所有 AI 提供商
 */
export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const providers = await prisma.aiProvider.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 脱敏：只返回 apiKey 的前 8 位
    const masked = providers.map((p) => ({
      ...p,
      apiKey: p.apiKey.slice(0, 8) + "…",
    }));

    return NextResponse.json({ success: true, data: masked });
  } catch (error) {
    console.error("[GET /api/admin/ai-providers]", error);
    return NextResponse.json({ success: false, message: "获取失败" }, { status: 500 });
  }
}

/**
 * POST /api/admin/ai-providers — 创建 AI 提供商
 * Body: { name, baseUrl, apiKey, model, isActive? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const body = await request.json();
    const { name, baseUrl, apiKey, model, isActive } = body;

    if (!name || !baseUrl || !apiKey || !model) {
      return NextResponse.json(
        { success: false, message: "名称、API 地址、密钥、模型为必填项" },
        { status: 400 }
      );
    }

    // 如果设置为活跃，先取消其他活跃
    if (isActive) {
      await prisma.aiProvider.updateMany({ data: { isActive: false } });
    }

    const provider = await prisma.aiProvider.create({
      data: { name, baseUrl, apiKey, model, isActive: !!isActive },
    });

    return NextResponse.json({
      success: true,
      data: { ...provider, apiKey: provider.apiKey.slice(0, 8) + "…" },
    });
  } catch (error) {
    console.error("[POST /api/admin/ai-providers]", error);
    return NextResponse.json({ success: false, message: "创建失败" }, { status: 500 });
  }
}