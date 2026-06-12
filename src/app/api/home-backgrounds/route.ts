import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/home-backgrounds — 获取所有启用的首页背景图片（公开接口）
 */
export async function GET() {
  try {
    const backgrounds = await prisma.homeBackground.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { url: true, name: true },
    });

    return NextResponse.json({ success: true, data: backgrounds });
  } catch (error) {
    console.error("[GET /api/home-backgrounds]", error);
    return NextResponse.json({ success: false, message: "获取失败" }, { status: 500 });
  }
}