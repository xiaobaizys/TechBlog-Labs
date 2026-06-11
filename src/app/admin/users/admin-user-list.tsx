"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserAvatar } from "@/components/user/UserAvatar";
import { toast } from "@/lib/toast";

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

type PaginationInfo = {
  page: number;
  totalPages: number;
  total: number;
};

// ============================================================
// 组件
// ============================================================

export function AdminUserList({
  users,
  pagination,
  search,
  role,
  currentUserId,
}: {
  users: AdminUser[];
  pagination: PaginationInfo;
  search: string;
  role: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  // ---------- 搜索 ----------
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set("search", searchInput.trim());
    if (role) params.set("role", role);
    router.push(`/admin/users?${params.toString()}`);
  }

  // ---------- 角色筛选 ----------
  function handleRoleFilter(newRole: string) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (newRole) params.set("role", newRole);
    router.push(`/admin/users?${params.toString()}`);
  }

  // ---------- 修改角色 ----------
  async function handleChangeRole(userId: string, newRole: string) {
    setChangingRole(userId);
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "角色修改失败");
      } else {
        toast.success("角色已更新");
      }
      router.refresh();
      setChangingRole(null);
    });
  }

  // ---------- 删除用户 ----------
  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`确定删除用户「${userName}」？`)) return;

    setDeletingUser(userId);
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
        toast.success("用户已删除");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "删除失败");
      }
      setDeletingUser(null);
    });
  }

  // ---------- 分页 ----------
  function PaginationBar() {
    if (pagination.totalPages <= 1) return null;
    return (
      <div className="mt-6 flex items-center justify-center gap-1">
        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
          const params = new URLSearchParams();
          params.set("page", String(p));
          if (search) params.set("search", search);
          if (role) params.set("role", role);
          return (
            <Link
              key={p}
              href={`/admin/users?${params.toString()}`}
              className={`flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-2 text-sm ${
                p === pagination.page
                  ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                  : "border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]"
              }`}
            >
              {p}
            </Link>
          );
        })}
      </div>
    );
  }

  // ============================================================
  // JSX
  // ============================================================
  return (
    <div>
      {/* 搜索 + 筛选 */}
      <div className="mb-6 flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜索姓名或邮箱..."
            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none focus:border-primary-500 w-48 sm:w-64"
          />
          <button
            type="submit"
            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-sm transition-colors hover:bg-[rgb(var(--muted))]"
          >
            搜索
          </button>
        </form>

        <select
          value={role}
          onChange={(e) => handleRoleFilter(e.target.value)}
          className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none"
        >
          <option value="">全部角色</option>
          <option value="ADMIN">管理员</option>
          <option value="USER">普通用户</option>
        </select>
      </div>

      {/* 表格 */}
      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[rgb(var(--border))] p-12 text-center">
          <p className="text-sm text-[rgb(var(--muted-foreground))]">暂无用户</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[rgb(var(--border))]">
          <table className="w-full text-sm">
            <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))] text-left">
              <tr>
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">邮箱</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">文章/评论</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">注册时间</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                const isDeleted = !!user.deletedAt;
                return (
                  <tr
                    key={user.id}
                    className={`transition-colors hover:bg-[rgb(var(--muted))]/50 ${
                      isDeleted ? "opacity-50 line-through" : ""
                    }`}
                  >
                    {/* 用户信息 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          name={user.name}
                          image={user.image}
                          userId={user.id}
                          size="sm"
                        />
                        <div>
                          <span className="font-medium">{user.name || "未命名"}</span>
                          {isSelf && (
                            <span className="ml-1.5 rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                              我
                            </span>
                          )}
                          {isDeleted && (
                            <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
                              已删除
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 邮箱 */}
                    <td className="px-4 py-3 hidden md:table-cell text-[rgb(var(--muted-foreground))]">
                      {user.email || "-"}
                    </td>

                    {/* 角色 */}
                    <td className="px-4 py-3">
                      {user.role === "ADMIN" ? (
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          管理员
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          用户
                        </span>
                      )}
                    </td>

                    {/* 统计 */}
                    <td className="px-4 py-3 hidden lg:table-cell text-[rgb(var(--muted-foreground))]">
                      {user._count.posts} / {user._count.comments}
                    </td>

                    {/* 注册时间 */}
                    <td className="px-4 py-3 hidden md:table-cell text-[rgb(var(--muted-foreground))]">
                      {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                    </td>

                    {/* 操作 */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 修改角色 */}
                        {!isDeleted && !isSelf && (
                          <select
                            value={user.role}
                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
                            disabled={changingRole === user.id || isPending}
                            className="rounded border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-1 text-xs outline-none"
                          >
                            <option value="USER">普通用户</option>
                            <option value="ADMIN">管理员</option>
                          </select>
                        )}

                        {/* 删除 */}
                        {!isDeleted && !isSelf && (
                          <button
                            onClick={() =>
                              handleDelete(user.id, user.name || user.email || "未知")
                            }
                            disabled={deletingUser === user.id || isPending}
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                          >
                            {deletingUser === user.id ? "删除中" : "删除"}
                          </button>
                        )}

                        {isSelf && (
                          <span className="text-xs text-[rgb(var(--muted-foreground))]">
                            -
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar />
    </div>
  );
}
