import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminLifeList } from "./admin-life-list";

// ============================================================
// 类型
// ============================================================

type AdminLifePost = {
  id: string;
  content: string;
  images: string[];
  likeCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string | null; image: string | null };
};

type AdminListData = {
  data: AdminLifePost[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

// 直接用 Prisma 查 DB
async function getAdminLifePosts(
  page: number,
  filter?: string
): Promise<AdminListData> {
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (filter === "public") {
    where.isPublic = true;
  } else if (filter === "private") {
    where.isPublic = false;
  }

  const [posts, total] = await Promise.all([
    prisma.lifePost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        content: true,
        images: true,
        likeCount: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.lifePost.count({ where }),
  ]);

  return {
    data: posts.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export default async function AdminLifePage({
  searchParams,
}: {
  searchParams: { page?: string; filter?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const filter = searchParams.filter ?? "ALL";
  const { data: posts, pagination } = await getAdminLifePosts(page, filter);

  const filterTabs = [
    { label: "全部", value: "ALL" },
    { label: "公开", value: "public" },
    { label: "私密", value: "private" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 标题栏 */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">生活分享管理</h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
            共 {pagination.total} 条生活分享
          </p>
        </div>
      </div>

      {/* 状态过滤 Tab */}
      <div className="mb-6 flex gap-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-1 w-fit">
        {filterTabs.map((tab) => (
          <a
            key={tab.value}
            href={`/admin/life?filter=${tab.value}`}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              filter === tab.value
                ? "bg-[rgb(var(--card))] text-[rgb(var(--foreground))] shadow-sm"
                : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* 生活分享列表 */}
      <AdminLifeList posts={posts} pagination={pagination} />
    </div>
  );
}