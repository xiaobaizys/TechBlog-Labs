import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/life-posts/user/:userId — 用户分享列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();
    const { userId } = params;
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(30, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10)));

    const isSelf = session?.user?.id === userId;

    // 私密分享仅作者本人可见（管理员查看他人主页时也只能看到公开的）
    const where: Record<string, unknown> = { authorId: userId };
    if (!isSelf) {
      where.isPublic = true;
    }

    const [posts, total] = await Promise.all([
      prisma.lifePost.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, content: true, images: true, likeCount: true, isPublic: true,
          createdAt: true, updatedAt: true,
          author: { select: { id: true, name: true, image: true } },
          ...(session?.user?.id
            ? { likes: { where: { userId: session.user.id }, select: { id: true } } }
            : {}),
        },
      }),
      prisma.lifePost.count({ where: where as any }),
    ]);

    const formatted = posts.map(({ likes, ...p }) => ({
      ...p,
      isLiked: likes ? likes.length > 0 : false,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("[GET /api/life-posts/user/:userId]", error);
    return NextResponse.json({ success: false, message: "获取失败" }, { status: 500 });
  }
}
