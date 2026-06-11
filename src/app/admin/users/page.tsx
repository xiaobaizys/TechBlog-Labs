import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminUserList } from "./admin-user-list";

// ============================================================
// 类型
// ============================================================

type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  emailVerified: string | null;
  createdAt: string;
  deletedAt: string | null;
  _count: { posts: number; comments: number };
};

type UsersData = {
  data: AdminUser[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

// 直接用 Prisma 查 DB（避免服务端 fetch 自家 API 缺 cookie → 403）
async function getUsers(
  page: number,
  search?: string,
  role?: string
): Promise<UsersData> {
  const pageSize = 10;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role === "ADMIN" || role === "USER") {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        deletedAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    }),
    prisma.user.count({ where: where as any }),
  ]);

  return {
    data: users.map((u) => ({
      ...u,
      emailVerified: u.emailVerified?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      deletedAt: u.deletedAt?.toISOString() ?? null,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; role?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const search = searchParams.search;
  const role = searchParams.role;
  const { data: users, pagination } = await getUsers(page, search, role);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">用户管理</h1>
      <AdminUserList
        users={users}
        pagination={pagination}
        search={search ?? ""}
        role={role ?? ""}
        currentUserId={session.user.id}
      />
    </div>
  );
}
