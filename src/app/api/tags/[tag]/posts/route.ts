import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tags/:tag/posts — 获取某标签下的文章列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tag: string } }
) {
  try {
    const { tag: tagSlug } = params;

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10)));

    // ---------- 检查标签是否存在 ----------
    const tag = await prisma.tag.findUnique({
      where: { slug: tagSlug },
      select: { id: true, name: true, slug: true },
    });

    if (!tag) {
      return NextResponse.json(
        { success: false, message: "标签不存在" },
        { status: 404 }
      );
    }

    // ---------- 查询条件 ----------
    const where = {
      post: {
        status: "PUBLISHED" as const,
        deletedAt: null,
      },
      tagId: tag.id,
    };

    // ---------- 并行查询 ----------
    const [tagOnPosts, total] = await Promise.all([
      prisma.tagOnPost.findMany({
        where,
        orderBy: { post: { createdAt: "desc" } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          post: {
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
              author: {
                select: { id: true, name: true, image: true },
              },
              tags: {
                select: {
                  tag: { select: { id: true, name: true, slug: true } },
                },
              },
            },
          },
        },
      }),
      prisma.tagOnPost.count({ where }),
    ]);

    const posts = tagOnPosts.map((t) => ({
      ...t.post,
      tags: t.post.tags.map((tt) => tt.tag),
    }));

    return NextResponse.json({
      success: true,
      data: {
        tag,
        posts,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/tags/:tag/posts]", error);
    return NextResponse.json(
      { success: false, message: "获取文章列表失败" },
      { status: 500 }
    );
  }
}
