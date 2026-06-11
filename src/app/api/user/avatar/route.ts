import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/user/avatar — 更新当前登录用户的头像 URL
 * DELETE /api/user/avatar — 清空头像（恢复默认）
 *
 * 设计说明：
 *  - 这里只负责"把 user.image 字段更新到 DB"
 *  - 文件上传仍走 /api/upload 拿到 URL，再把 URL 传过来
 *  - 这样职责分离：上传 vs 元数据写入
 */
const URL_RE = /^(\/uploads\/[a-zA-Z0-9._-]+|https?:\/\/[^\s]+)$/;

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const image: unknown = body?.image;

    if (typeof image !== "string" || !URL_RE.test(image)) {
      return NextResponse.json(
        { success: false, message: "头像 URL 不合法" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image },
    });

    return NextResponse.json({
      success: true,
      message: "头像已更新",
      data: { image },
    });
  } catch (error) {
    console.error("[PUT /api/user/avatar]", error);
    return NextResponse.json(
      { success: false, message: "更新失败" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "请先登录" },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null },
    });

    return NextResponse.json({ success: true, message: "头像已重置" });
  } catch (error) {
    console.error("[DELETE /api/user/avatar]", error);
    return NextResponse.json(
      { success: false, message: "重置失败" },
      { status: 500 }
    );
  }
}
