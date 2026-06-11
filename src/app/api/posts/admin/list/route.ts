import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/posts/admin/list — 管理员文章列表
 *
 * 返回所有文章（包括 DRAFT 和已软删除的）
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
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
    const status = searchParams.get("status"); // PUBLISHED | DRAFT | DELETED

    // ---------- 构建查询条件 ----------
    const where: Record<string, unknown> = {};

    if (status === "DELETED") {
      where.deletedAt = { not: null };
    } else if (status === "DRAFT") {
      where.status = "DRAFT";
      where.deletedAt = null;
    } else if (status === "PUBLISHED") {
      where.status = "PUBLISHED";
      where.deletedAt = null;
    }
    // 默认返回全部（包括软删除）

    // ---------- 并行查询 ----------
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: where as any,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          status: true,
          featured: true,
          viewCount: true,
          likeCount: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          author: {
            select: { id: true, name: true, image: true },
          },
          tags: {
            select: {
              tag: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      }),
      prisma.post.count({ where: where as any }),
    ]);

    return NextResponse.json({
      success: true,
      data: posts.map((p) => ({
        ...p,
        tags: p.tags.map((t) => t.tag),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[GET /api/posts/admin/list]", error);
    return NextResponse.json(
      { success: false, message: "获取文章列表失败" },
      { status: 500 }
    );
  }
}
