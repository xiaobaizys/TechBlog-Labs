import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/posts/:slug — 获取单篇文章
 *
 * - 公开文章：status=PUBLISHED 且未软删除
 * - 管理员可预览 DRAFT 文章
 * - 访问时自动增加 viewCount
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";

    // ---------- 查询文章 ----------
    const post = await prisma.post.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
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
        _count: {
          select: { comments: true },
        },
      },
    });

    // ---------- 不存在 ----------
    if (!post) {
      return NextResponse.json(
        { success: false, message: "文章不存在" },
        { status: 404 }
      );
    }

    // ---------- 权限检查 ----------
    if (post.deletedAt) {
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, message: "文章不存在" },
          { status: 404 }
        );
      }
    }

    if (post.status !== "PUBLISHED" && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "文章不存在" },
        { status: 404 }
      );
    }

    // ---------- 阅读量 +1（公开访问时） ----------
    if (!isAdmin || session?.user?.id !== post.author.id) {
      await prisma.post.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    // ---------- 检查当前用户是否点赞 ----------
    let isLiked = false;
    if (session?.user?.id) {
      const like = await prisma.postLike.findUnique({
        where: {
          userId_postId: {
            userId: session.user.id,
            postId: post.id,
          },
        },
      });
      isLiked = !!like;
    }

    // ---------- 格式化响应 ----------
    return NextResponse.json({
      success: true,
      data: {
        ...post,
        tags: post.tags.map((t) => t.tag),
        commentCount: post._count.comments,
        isLiked,
      },
    });
  } catch (error) {
    console.error("[GET /api/posts/:slug]", error);
    return NextResponse.json(
      { success: false, message: "获取文章失败" },
      { status: 500 }
    );
  }
}
