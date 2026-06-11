import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/dashboard — 数据看板统计
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    // 获取当前日期
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ---------- 基础统计（并行）----------
    const [
      totalPosts,
      totalComments,
      totalUsers,
      totalViewsResult,
      topPosts,
    ] = await Promise.all([
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.comment.count(),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.post.aggregate({
        _sum: { viewCount: true },
        where: { deletedAt: null },
      }),
      prisma.post.findMany({
        where: { deletedAt: null },
        orderBy: { viewCount: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          viewCount: true,
          likeCount: true,
        },
      }),
    ]);

    // ---------- 近7天数据 ----------
    const weeklyPosts: { date: string; count: number }[] = [];
    const weeklyComments: { date: string; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(startOfToday);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dateStr = dayStart.toISOString().slice(0, 10);

      const [postCount, commentCount] = await Promise.all([
        prisma.post.count({
          where: {
            createdAt: { gte: dayStart, lt: dayEnd },
            deletedAt: null,
          },
        }),
        prisma.comment.count({
          where: {
            createdAt: { gte: dayStart, lt: dayEnd },
          },
        }),
      ]);

      weeklyPosts.push({ date: dateStr, count: postCount });
      weeklyComments.push({ date: dateStr, count: commentCount });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalPosts,
        totalComments,
        totalUsers,
        totalViews: totalViewsResult._sum.viewCount ?? 0,
        weeklyPosts,
        weeklyComments,
        topPosts,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/dashboard]", error);
    return NextResponse.json(
      { success: false, message: "获取统计数据失败" },
      { status: 500 }
    );
  }
}
