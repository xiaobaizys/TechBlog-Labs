import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("id");
  const tagIds = searchParams.get("tags")?.split(",").filter(Boolean) || [];

  if (!postId) {
    return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
  }

  try {
    // 基于标签匹配的相关文章
    const where: any = {
      id: { not: postId },
      published: true,
      status: "PUBLISHED",
      deletedAt: null,
    };

    // 如果有标签，优先按标签匹配
    if (tagIds.length > 0) {
      where.tags = {
        some: {
          tagId: { in: tagIds },
        },
      };
    }

    const posts = await prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
        tags: {
          select: {
            tag: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { tags: true },
        },
      },
      orderBy: [
        // 标签匹配数量越多越相关
        { tags: { _count: "desc" } },
        // 最新的优先
        { publishedAt: "desc" },
      ],
      take: 6,
    });

    // 格式化返回数据
    const formattedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      publishedAt: post.publishedAt?.toISOString() || null,
      tags: post.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
      })),
    }));

    return NextResponse.json({ posts: formattedPosts });
  } catch (error) {
    console.error("Error fetching related posts:", error);
    return NextResponse.json({ posts: [] });
  }
}
