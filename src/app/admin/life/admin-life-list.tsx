"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

type AdminLifeListProps = {
  posts: AdminLifePost[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export function AdminLifeList({ posts, pagination }: AdminLifeListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条生活分享吗？")) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/life-posts/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert("删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      alert("删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublic = async (id: string, currentIsPublic: boolean) => {
    try {
      const response = await fetch(`/api/life-posts/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublic: !currentIsPublic }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert("更新失败");
      }
    } catch (error) {
      console.error("更新失败:", error);
      alert("更新失败");
    }
  };

  if (posts.length === 0) {
    return (
      <div className="theme-card p-8 text-center">
        <p className="text-[rgb(var(--muted-foreground))]">暂无生活分享</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="theme-card p-5 transition-all hover:border-amber/40"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* 作者信息 */}
              <div className="flex items-center gap-2 mb-3">
                {post.author.image && (
                  <img
                    src={post.author.image}
                    alt={post.author.name || "用户"}
                    className="h-6 w-6 rounded-full"
                  />
                )}
                <span className="text-sm font-medium">
                  {post.author.name || "匿名用户"}
                </span>
                <span className="text-xs text-[rgb(var(--muted-foreground))]">
                  {new Date(post.createdAt).toLocaleString("zh-CN")}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    post.isPublic
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-amber/10 text-amber-bright"
                  }`}
                >
                  {post.isPublic ? "公开" : "私密"}
                </span>
              </div>

              {/* 内容 */}
              <p className="text-sm text-[rgb(var(--foreground))] whitespace-pre-wrap break-words">
                {post.content}
              </p>

              {/* 图片 */}
              {post.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.images.slice(0, 3).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`图片 ${index + 1}`}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ))}
                  {post.images.length > 3 && (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[rgb(var(--muted))] text-xs text-[rgb(var(--muted-foreground))]">
                      +{post.images.length - 3}
                    </div>
                  )}
                </div>
              )}

              {/* 统计 */}
              <div className="mt-3 flex items-center gap-4 text-xs text-[rgb(var(--muted-foreground))]">
                <span>❤️ {post.likeCount} 点赞</span>
                <span>📷 {post.images.length} 图片</span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleTogglePublic(post.id, post.isPublic)}
                className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  post.isPublic
                    ? "bg-amber/10 text-amber-bright hover:bg-amber/20"
                    : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                }`}
              >
                {post.isPublic ? "设为私密" : "设为公开"}
              </button>
              <button
                onClick={() => handleDelete(post.id)}
                disabled={deletingId === post.id}
                className="inline-flex items-center justify-center rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                {deletingId === post.id ? "删除中..." : "删除"}
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (pageNum) => (
              <Link
                key={pageNum}
                href={`/admin/life?page=${pageNum}`}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  pageNum === pagination.page
                    ? "bg-amber text-white"
                    : "bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]/80"
                }`}
              >
                {pageNum}
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}