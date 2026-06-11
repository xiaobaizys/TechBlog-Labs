import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/comments — 管理员获取所有评论
 *
 * - 支持分页：?page=1&pageSize=30
 * - 支持审核状态筛选：?approved=false
 * - 支持文章筛选：?postId=xxx
 * - 显示评论内容、作者、所属文章、审核状态
 */
export async function GET(request: NextRequest) {
  try {
    // ---------- 验证管理员权限 ----------
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
      );
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "30", 10)));
    const approved = searchParams.get("approved"); // "true" | "false"
    const postId = searchParams.get("postId");

    // ---------- 构建查询条件 ----------
    const where: Record<string, unknown> = {};

    if (approved === "true") {
      where.isApproved = true;
    } else if (approved === "false") {
      where.isApproved = false;
    }

    if (postId) {
      where.postId = postId;
    }

    // ---------- 并行查询 ----------
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          content: true,
          isApproved: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: { id: true, name: true, email: true, image: true },
          },
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          parent: {
            select: {
              id: true,
              content: true,
            },
          },
        },
      }),
      prisma.comment.count({ where: where as any }),
    ]);

    return NextResponse.json({
      success: true,
      data: comments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/comments]", error);
    return NextResponse.json(
      { success: false, message: "获取评论列表失败" },
      { status: 500 }
    );
  }
}
