"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserAvatar } from "@/components/user/UserAvatar";
import { toast } from "@/lib/toast";

// ============================================================
// 类型
// ============================================================

type AdminComment = {
  id: string;
  content: string;
  isApproved: boolean;
  parentId: string | null;
  createdAt: string;
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

type PaginationInfo = {
  page: number;
  totalPages: number;
  total: number;
};

// ============================================================
// 组件
// ============================================================

export function AdminCommentList({
  comments,
  pagination,
  approved,
  postId,
}: {
  comments: AdminComment[];
  pagination: PaginationInfo;
  approved?: string;
  postId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleApprove(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/comments/${id}/approve`, { method: "PUT" });
      if (res.ok) {
        router.refresh();
        toast.success("已通过审核");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "审核失败");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这条评论？所有子回复也将被删除。")) return;

    startTransition(async () => {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
        toast.success("评论已删除");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "删除失败");
      }
    });
  }

  function buildFilterUrl(params: Record<string, string>) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) p.set(k, v);
    }
    return `/admin/comments?${p.toString()}`;
  }

  if (comments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[rgb(var(--border))] p-12 text-center">
        <p className="text-sm text-[rgb(var(--muted-foreground))]">
          暂无评论
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-[rgb(var(--border))]">
        <table className="w-full text-sm">
          <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))] text-left">
            <tr>
              <th className="px-4 py-3 font-medium w-[30%]">内容</th>
              <th className="px-4 py-3 font-medium">作者</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">
                所属文章
              </th>
              <th className="px-4 py-3 font-medium">审核状态</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">
                时间
              </th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(var(--border))]">
            {comments.map((comment) => (
              <tr
                key={comment.id}
                className={`transition-colors hover:bg-[rgb(var(--muted))]/50 ${
                  !comment.isApproved ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                }`}
              >
                {/* 内容 */}
                <td className="px-4 py-3">
                  <div className="max-w-xs">
                    {comment.parentId && comment.parent && (
                      <span className="mb-1 block text-xs text-[rgb(var(--muted-foreground))]">
                        ↳ 回复: {comment.parent.content.slice(0, 30)}
                        {comment.parent.content.length > 30 ? "..." : ""}
                      </span>
                    )}
                    <span className="line-clamp-2">{comment.content}</span>
                  </div>
                </td>

                {/* 作者 */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      name={comment.author.name}
                      image={comment.author.image}
                      userId={comment.author.id}
                      size="xs"
                    />
                    <span className="truncate max-w-[80px]">
                      {comment.author.name || "匿名"}
                    </span>
                  </div>
                </td>

                {/* 所属文章 */}
                <td className="px-4 py-3 hidden lg:table-cell">
                  <Link
                    href={`/blog/${comment.post.slug}`}
                    target="_blank"
                    className="text-primary-600 dark:text-primary-400 hover:underline truncate block max-w-[120px]"
                  >
                    {comment.post.title}
                  </Link>
                </td>

                {/* 审核状态 */}
                <td className="px-4 py-3">
                  {comment.isApproved ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                      已审核
                    </span>
                  ) : (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      待审核
                    </span>
                  )}
                </td>

                {/* 时间 */}
                <td className="px-4 py-3 hidden md:table-cell text-[rgb(var(--muted-foreground))]">
                  {new Date(comment.createdAt).toLocaleDateString("zh-CN")}
                </td>

                {/* 操作 */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {!comment.isApproved && (
                      <button
                        onClick={() => handleApprove(comment.id)}
                        disabled={isPending}
                        className="rounded-md px-2.5 py-1 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                      >
                        通过
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={isPending}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (p) => (
              <Link
                key={p}
                href={buildFilterUrl({
                  page: String(p),
                  approved: approved ?? "",
                  postId: postId ?? "",
                })}
                className={`flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-2 text-sm ${
                  p === pagination.page
                    ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                    : "border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]"
                }`}
              >
                {p}
              </Link>
            )
          )}
        </div>
      )}
    </>
  );
}
