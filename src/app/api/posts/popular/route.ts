import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

/**
 * GET /api/posts/popular
 *
 * 获取热门文章 Top N（按 viewCount 降序）
 * 默认返回前 5 篇，支持 ?limit=N 参数（最大 20）
 * 缓存 5 分钟
 */
const getPopularPosts = unstable_cache(
  async (limit: number) => {
    return prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        viewCount: true,
        likeCount: true,
        publishedAt: true,
        tags: {
          select: {
            tag: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        _count: { select: { comments: true } },
      },
      orderBy: { viewCount: "desc" },
      take: limit,
    });
  },
  ["popular-posts"],
  { revalidate: 300, tags: ["posts"] }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("limit");
  let limit = 5;
  if (raw) {
    const n = parseInt(raw, 10);
    if (n > 0 && n <= 20) limit = n;
  }

  try {
    const posts = await getPopularPosts(limit);
    const result = posts.map((p) => ({
      ...p,
      tags: p.tags.map((t) => t.tag),
      comments: p._count.comments,
      _count: undefined,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[GET /api/posts/popular]", error);
    return NextResponse.json(
      { success: false, message: "获取热门文章失败" },
      { status: 500 }
    );
  }
}
