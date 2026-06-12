import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/home-backgrounds — 获取所有启用的首页背景图片（公开接口）
 */
export async function GET() {
  try {
    // 检查 HomeBackground 表是否存在
    const backgrounds = await prisma.homeBackground.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { url: true, name: true },
    });

    return NextResponse.json({ success: true, data: backgrounds });
  } catch (error) {
    console.error("[GET /api/home-backgrounds]", error);
    const message =
      error instanceof Error && error.message.includes("does not exist")
        ? "数据库未初始化，请运行 npx prisma db push"
        : "获取背景图片失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}