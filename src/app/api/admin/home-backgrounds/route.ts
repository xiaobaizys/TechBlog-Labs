import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/home-backgrounds — 列出所有首页背景图片
 */
export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const backgrounds = await prisma.homeBackground.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: backgrounds });
  } catch (error) {
    console.error("[GET /api/admin/home-backgrounds]", error);
    return NextResponse.json({ success: false, message: "获取失败" }, { status: 500 });
  }
}

/**
 * POST /api/admin/home-backgrounds — 创建背景图片
 * Body: { url, name, sortOrder?, isActive? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const body = await request.json();
    const { url, name, sortOrder, isActive } = body;

    if (!url || !name) {
      return NextResponse.json(
        { success: false, message: "图片 URL 和名称为必填项" },
        { status: 400 }
      );
    }

    const bg = await prisma.homeBackground.create({
      data: {
        url,
        name,
        sortOrder: sortOrder ?? 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ success: true, data: bg });
  } catch (error) {
    console.error("[POST /api/admin/home-backgrounds]", error);
    return NextResponse.json({ success: false, message: "创建失败" }, { status: 500 });
  }
}