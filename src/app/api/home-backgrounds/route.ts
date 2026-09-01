import { NextResponse } from "next/server";
import {
  getActiveHomeBackgrounds,
} from "@/lib/home-backgrounds-cache";

/**
 * GET /api/home-backgrounds — 获取所有启用的首页背景图片（公开接口）
 *
 * 使用多级缓存（内存 + Redis）减少数据库查询；
 * 响应头带 stale-while-revalidate，允许 CDN/浏览器在过期后先用旧数据。
 */
export async function GET() {
  try {
    const backgrounds = await getActiveHomeBackgrounds();

    return NextResponse.json(
      { success: true, data: backgrounds },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/home-backgrounds]", error);
    const message =
      error instanceof Error && error.message.includes("does not exist")
        ? "数据库未初始化，请运行 npx prisma db push"
        : "获取背景图片失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}