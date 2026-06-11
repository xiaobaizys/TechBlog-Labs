import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./dashboard-client";

// ============================================================
// 类型
// ============================================================

type DashboardData = {
  totalPosts: number;
  totalComments: number;
  totalUsers: number;
  totalViews: number;
  weeklyPosts: { date: string; count: number }[];
  weeklyComments: { date: string; count: number }[];
  topPosts: { id: string; title: string; slug: string; viewCount: number; likeCount: number }[];
};

// 直接用 Prisma 查 DB（避免服务端 fetch 自家 API 缺 cookie → 403）
async function getDashboard(): Promise<DashboardData> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 基础统计并行
  const [totalPosts, totalComments, totalUsers, totalViewsResult, topPosts] =
    await Promise.all([
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

  // 近 7 天逐日统计
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
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
      }),
    ]);

    weeklyPosts.push({ date: dateStr, count: postCount });
    weeklyComments.push({ date: dateStr, count: commentCount });
  }

  return {
    totalPosts,
    totalComments,
    totalUsers,
    totalViews: totalViewsResult._sum.viewCount ?? 0,
    weeklyPosts,
    weeklyComments,
    topPosts,
  };
}

// ============================================================
// 页面
// ============================================================

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const data = await getDashboard();
  return <DashboardClient data={data} />;
}
