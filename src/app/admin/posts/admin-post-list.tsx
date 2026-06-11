"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "@/lib/toast";

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

type PaginationInfo = {
  page: number;
  totalPages: number;
  total: number;
};

// ============================================================
// 组件
// ============================================================

export function AdminPostList({
  posts,
  pagination,
  status,
}: {
  posts: AdminPost[];
  pagination: PaginationInfo;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleDelete(id: string) {
    if (!confirm("确定删除这篇文章？")) return;

    startTransition(async () => {
      const res = await fetch(`/api/posts/admin/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
        toast.success("文章已删除");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "删除失败");
      }
    });
  }

  async function handleRestore(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/posts/admin/${id}?action=restore`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
        toast.success("文章已恢复");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "恢复失败");
      }
    });
  }

  function statusBadge(s: string, deletedAt: string | null) {
    if (deletedAt) {
      return (
        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
          已删除
        </span>
      );
    }
    if (s === "PUBLISHED") {
      return (
        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
          已发布
        </span>
      );
    }
    return (
      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
        草稿
      </span>
    );
  }

  // ============================================================
  // 分页
  // ============================================================
  function PaginationBar() {
    if (pagination.totalPages <= 1) return null;
    const pages: number[] = [];
    for (let i = 1; i <= pagination.totalPages; i++) pages.push(i);

    return (
      <div className="mt-6 flex items-center justify-center gap-1">
        {pages.map((p) => (
          <Link
            key={p}
            href={`/admin/posts?status=${status}&page=${p}`}
            className={`flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-2 text-sm ${
              p === pagination.page
                ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                : "border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]"
            }`}
          >
            {p}
          </Link>
        ))}
      </div>
    );
  }

  // ============================================================
  // JSX
  // ============================================================
  return (
    <>
      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[rgb(var(--border))] p-12 text-center">
          <p className="text-sm text-[rgb(var(--muted-foreground))]">
            暂无文章
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[rgb(var(--border))]">
          <table className="w-full text-sm">
            <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))] text-left">
              <tr>
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">
                  状态
                </th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">
                  标签
                </th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">
                  阅读/点赞
                </th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">
                  更新日期
                </th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className={`transition-colors hover:bg-[rgb(var(--muted))]/50 ${
                    post.deletedAt ? "opacity-60" : ""
                  }`}
                >
                  {/* 标题 */}
                  <td className="px-4 py-3">
                    <div className="max-w-xs truncate">
                      <span className="font-medium">{post.title}</span>
                      {post.featured && (
                        <span className="ml-1.5 text-xs text-amber-500">★</span>
                      )}
                    </div>
                  </td>

                  {/* 状态 */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    {statusBadge(post.status, post.deletedAt)}
                  </td>

                  {/* 标签 */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded border border-[rgb(var(--border))] px-1.5 py-0.5 text-xs text-[rgb(var(--muted-foreground))]"
                        >
                          {tag.name}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="text-xs text-[rgb(var(--muted-foreground))]">
                          +{post.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 阅读/点赞 */}
                  <td className="px-4 py-3 hidden md:table-cell text-[rgb(var(--muted-foreground))]">
                    {post.viewCount} / {post.likeCount}
                  </td>

                  {/* 日期 */}
                  <td className="px-4 py-3 hidden lg:table-cell text-[rgb(var(--muted-foreground))]">
                    {new Date(post.updatedAt).toLocaleDateString("zh-CN")}
                  </td>

                  {/* 操作 */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {post.deletedAt ? (
                        <button
                          onClick={() => handleRestore(post.id)}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                        >
                          恢复
                        </button>
                      ) : (
                        <>
                          <Link
                            href={`/admin/posts/edit/${post.id}`}
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors"
                          >
                            编辑
                          </Link>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar />
    </>
  );
}
