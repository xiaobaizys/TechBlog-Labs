import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPostList } from "./admin-post-list";

// ============================================================
// 类型
// ============================================================

type AdminPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  featured: boolean;
  viewCount: number;
  likeCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  author: { id: string; name: string | null; image: string | null };
  tags: { id: string; name: string; slug: string }[];
};

type AdminListData = {
  data: AdminPost[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

// 直接用 Prisma 查 DB（避免服务端 fetch 自家 API 缺 cookie → 403）
async function getAdminPosts(
  page: number,
  status?: string
): Promise<AdminListData> {
  const pageSize = 20;

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
        status: true,
        featured: true,
        viewCount: true,
        likeCount: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        author: { select: { id: true, name: true, image: true } },
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    }),
    prisma.post.count({ where: where as any }),
  ]);

  return {
    data: posts.map((p) => ({
      ...p,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      deletedAt: p.deletedAt?.toISOString() ?? null,
      tags: p.tags.map((t) => t.tag),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const status = searchParams.status ?? "ALL";
  const { data: posts, pagination } = await getAdminPosts(page, status);

  const statusTabs = [
    { label: "全部", value: "ALL" },
    { label: "已发布", value: "PUBLISHED" },
    { label: "草稿", value: "DRAFT" },
    { label: "已删除", value: "DELETED" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 标题栏 */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">文章管理</h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
            共 {pagination.total} 篇文章
          </p>
        </div>
        <Link
          href="/admin/posts/new"
          className="btn-shimmer inline-flex items-center gap-1.5"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          新建文章
        </Link>
      </div>

      {/* 状态过滤 Tab */}
      <div className="mb-6 flex gap-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-1 w-fit">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/posts?status=${tab.value}`}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              status === tab.value
                ? "bg-[rgb(var(--card))] text-[rgb(var(--foreground))] shadow-sm"
                : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* 文章列表 */}
      <AdminPostList posts={posts} pagination={pagination} status={status} />
    </div>
  );
}
