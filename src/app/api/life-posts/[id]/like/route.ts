import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/life-posts/:id/like — 切换点赞
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "请先登录" }, { status: 401 });
    }

    const post = await prisma.lifePost.findUnique({
      where: { id: params.id }, select: { id: true },
    });
    if (!post) {
      return NextResponse.json({ success: false, message: "分享不存在" }, { status: 404 });
    }

    const existing = await prisma.lifeLike.findUnique({
      where: { userId_lifePostId: { userId: session.user.id, lifePostId: params.id } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.lifeLike.delete({ where: { id: existing.id } }),
        prisma.lifePost.update({ where: { id: params.id }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return NextResponse.json({ success: true, data: { liked: false } });
    } else {
      await prisma.$transaction([
        prisma.lifeLike.create({ data: { userId: session.user.id, lifePostId: params.id } }),
        prisma.lifePost.update({ where: { id: params.id }, data: { likeCount: { increment: 1 } } }),
      ]);
      return NextResponse.json({ success: true, data: { liked: true } });
    }
  } catch (error) {
    console.error("[POST /api/life-posts/:id/like]", error);
    return NextResponse.json({ success: false, message: "操作失败" }, { status: 500 });
  }
}
