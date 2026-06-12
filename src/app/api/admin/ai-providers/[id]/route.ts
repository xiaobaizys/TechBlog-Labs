import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/admin/ai-providers/[id] — 删除 AI 提供商
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.aiProvider.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/ai-providers/[id]]", error);
    return NextResponse.json({ success: false, message: "删除失败" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/ai-providers/[id] — 更新 AI 提供商
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, baseUrl, apiKey, model, isActive } = body;

    const data: Record<string, string | boolean> = {};
    if (name) data.name = name;
    if (baseUrl) data.baseUrl = baseUrl;
    if (apiKey) data.apiKey = apiKey;
    if (model) data.model = model;

    // 如果设置为活跃，先取消其他活跃
    if (isActive) {
      await prisma.aiProvider.updateMany({ data: { isActive: false } });
      data.isActive = true;
    }

    const provider = await prisma.aiProvider.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      data: { ...provider, apiKey: provider.apiKey.slice(0, 8) + "…" },
    });
  } catch (error) {
    console.error("[PUT /api/admin/ai-providers/[id]]", error);
    return NextResponse.json({ success: false, message: "更新失败" }, { status: 500 });
  }
}