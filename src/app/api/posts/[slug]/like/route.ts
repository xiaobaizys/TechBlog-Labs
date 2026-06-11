import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/posts/:slug/like — 切换点赞
 *
 * - 需要登录
 * - 已点赞 → 取消点赞，likeCount -1
 * - 未点赞 → 添加点赞，likeCount +1
 */
const handler = async (
  request: NextRequest,
  { params }: { params: { slug: string } }
) => {
  try {
    // ---------- 验证登录 ----------
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const { slug } = params;

    // ---------- 查找文章 ----------
    const post = await prisma.post.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, message: "文章不存在" },
        { status: 404 }
      );
    }

    // ---------- 检查是否已点赞 ----------
    const existing = await prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: post.id,
        },
      },
    });

    if (existing) {
      // 取消点赞
      await prisma.$transaction([
        prisma.postLike.delete({
          where: { id: existing.id },
        }),
        prisma.post.update({
          where: { id: post.id },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: { liked: false, message: "已取消点赞" },
      });
    } else {
      // 添加点赞
      await prisma.$transaction([
        prisma.postLike.create({
          data: {
            userId: session.user.id,
            postId: post.id,
          },
        }),
        prisma.post.update({
          where: { id: post.id },
          data: { likeCount: { increment: 1 } },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: { liked: true, message: "点赞成功" },
      });
    }
  } catch (error) {
    console.error("[POST /api/posts/:slug/like]", error);
    return NextResponse.json(
      { success: false, message: "操作失败" },
      { status: 500 }
    );
  }
};
export const POST = withRateLimit(RATE_LIMITS.interact, handler);

/**
 * GET /api/posts/:slug/like — 获取点赞状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await auth();
    const { slug } = params;

    // 未登录 → 未点赞
    if (!session?.user?.id) {
      return NextResponse.json({ success: true, data: { liked: false } });
    }

    const post = await prisma.post.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, message: "文章不存在" },
        { status: 404 }
      );
    }

    const existing = await prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: post.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { liked: !!existing },
    });
  } catch (error) {
    console.error("[GET /api/posts/:slug/like]", error);
    return NextResponse.json(
      { success: false, message: "获取点赞状态失败" },
      { status: 500 }
    );
  }
}
