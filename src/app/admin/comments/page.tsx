import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminCommentList } from "./admin-comment-list";

// ============================================================
// 类型
// ============================================================

type AdminComment = {
  id: string;
  content: string;
  isApproved: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  post: {
    id: string;
    title: string;
    slug: string;
  };
  parent: {
    id: string;
    content: string;
  } | null;
};

type AdminCommentsData = {
  data: AdminComment[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

// 直接用 Prisma 查 DB（避免服务端 fetch 自家 API 缺 cookie → 403）
async function getAdminComments(
  page: number,
  approved?: string,
  postId?: string
): Promise<AdminCommentsData> {
  const pageSize = 30;

  const where: Record<string, unknown> = {};
  if (approved === "true") {
    where.isApproved = true;
  } else if (approved === "false") {
    where.isApproved = false;
  }
  if (postId) {
    where.postId = postId;
  }

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        content: true,
        isApproved: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, email: true, image: true } },
        post: { select: { id: true, title: true, slug: true } },
        parent: { select: { id: true, content: true } },
      },
    }),
    prisma.comment.count({ where: where as any }),
  ]);

  return {
    data: comments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: { page?: string; approved?: string; postId?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const approved = searchParams.approved;
  const postId = searchParams.postId;
  const { data: comments, pagination } = await getAdminComments(
    page,
    approved,
    postId
  );

  const filterTabs = [
    { label: "全部", value: "" },
    { label: "待审核", value: "false" },
    { label: "已审核", value: "true" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 标题栏 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">评论管理</h1>
        <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
          共 {pagination.total} 条评论
        </p>
      </div>

      {/* 审核状态过滤 */}
      <div className="mb-6 flex gap-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-1 w-fit">
        {filterTabs.map((tab) => (
          <a
            key={tab.value}
            href={
              `/admin/comments` +
              (tab.value ? `?approved=${tab.value}` : "") +
              (postId ? `&postId=${postId}` : "")
            }
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              (tab.value === "" && approved === undefined) ||
              (tab.value !== "" && approved === tab.value)
                ? "bg-[rgb(var(--card))] text-[rgb(var(--foreground))] shadow-sm"
                : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* 评论列表 */}
      <AdminCommentList
        comments={comments}
        pagination={pagination}
        approved={approved}
        postId={postId}
      />
    </div>
  );
}
