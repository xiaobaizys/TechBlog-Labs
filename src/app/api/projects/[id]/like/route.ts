import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/projects/:id/like — 切换点赞
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "请先登录" }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id }, select: { id: true },
    });
    if (!project) return NextResponse.json({ success: false, message: "项目不存在" }, { status: 404 });

    const existing = await prisma.projectLike.findUnique({
      where: { userId_projectId: { userId: session.user.id, projectId: params.id } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.projectLike.delete({ where: { id: existing.id } }),
        prisma.project.update({ where: { id: params.id }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return NextResponse.json({ success: true, data: { liked: false } });
    } else {
      await prisma.$transaction([
        prisma.projectLike.create({ data: { userId: session.user.id, projectId: params.id } }),
        prisma.project.update({ where: { id: params.id }, data: { likeCount: { increment: 1 } } }),
      ]);
      return NextResponse.json({ success: true, data: { liked: true } });
    }
  } catch (error) {
    console.error("[POST /api/projects/:id/like]", error);
    return NextResponse.json({ success: false, message: "操作失败" }, { status: 500 });
  }
}
