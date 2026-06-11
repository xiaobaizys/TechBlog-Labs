"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import type { CommentNode } from "@/lib/comments/buildCommentTree";

type CommentSectionProps = {
  postId: string;
  /** 每页评论数，默认 20 */
  pageSize?: number;
};

export function CommentSection({ postId, pageSize = 20 }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const currentUserId = session?.user?.id;
  const isAdmin = session?.user?.role === "ADMIN";

  // ---------- 加载评论 ----------
  const loadComments = useCallback(async (p: number = 1) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/comments?postId=${postId}&page=${p}&pageSize=${pageSize}`
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "加载评论失败");
        return;
      }

      setComments(json.data);
      setTotalPages(json.pagination.totalPages);
      setPage(p);
    } catch {
      setError("加载评论失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments(1);
  }, [loadComments]);

  // ---------- 删除回调 ----------
  function handleDelete(commentId: string) {
    setComments((prev) => removeCommentFromTree(prev, commentId));
  }

  return (
    <section className="mt-12">
      {/* 标题 */}
      <div className="mb-6 flex items-center gap-2">
        <h3 className="text-lg font-bold tracking-tight">评论</h3>
        <span className="rounded-full bg-[rgb(var(--muted))] px-2.5 py-0.5 text-xs font-medium text-[rgb(var(--muted-foreground))]">
          {comments.length}
        </span>
      </div>

      {/* 评论表单 */}
      {currentUserId ? (
        <div className="mb-8 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <CommentForm
            postId={postId}
            onSuccess={() => loadComments(1)}
          />
        </div>
      ) : (
        <div className="mb-8 rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--muted))]/50 p-6 text-center">
          <p className="text-sm text-[rgb(var(--muted-foreground))]">
            <a
              href="/login"
              className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 underline underline-offset-2"
            >
              登录
            </a>
            后参与评论
          </p>
        </div>
      )}

      {/* 评论列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgb(var(--border))] border-t-amber" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[rgb(var(--border))] p-8 text-center">
          <svg
            className="mx-auto h-10 w-10 text-[rgb(var(--border))]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="mt-3 text-sm text-[rgb(var(--muted-foreground))]">
            暂无评论，来说两句吧
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-[rgb(var(--border))] rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => loadComments(p)}
                    className={`flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-2 text-sm font-medium transition-colors ${
                      p === page
                        ? "border-amber bg-amber/15 text-amber-bright"
                        : "border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ============================================================
// 工具：从评论树中移除已删除的评论
// ============================================================
function removeCommentFromTree(
  nodes: CommentNode[],
  targetId: string
): CommentNode[] {
  return nodes
    .filter((node) => node.id !== targetId)
    .map((node) => ({
      ...node,
      replies: node.replies
        ? removeCommentFromTree(node.replies, targetId)
        : undefined,
    }));
}
