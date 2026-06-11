import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePosts } from "@/lib/cache";

/**
 * PUT /api/comments/:id/approve — 审核通过评论（管理员）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ---------- 验证管理员权限 ----------
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
      );
    }

    const { id } = params;

    // ---------- 查找评论 ----------
    const existing = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, isApproved: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "评论不存在" },
        { status: 404 }
      );
    }

    if (existing.isApproved) {
      return NextResponse.json({
        success: true,
        message: "评论已审核通过",
        data: existing,
      });
    }

    // ---------- 审核通过 ----------
    const comment = await prisma.comment.update({
      where: { id },
      data: { isApproved: true },
      select: {
        id: true,
        content: true,
        isApproved: true,
        parentId: true,
        postId: true,
        createdAt: true,
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // 审核后让博客列表 / 详情页缓存失效（评论数 / 评论状态变化）
    revalidatePosts();

    return NextResponse.json({
      success: true,
      message: "审核通过",
      data: comment,
    });
  } catch (error) {
    console.error("[PUT /api/comments/:id/approve]", error);
    return NextResponse.json(
      { success: false, message: "操作失败" },
      { status: 500 }
    );
  }
}
