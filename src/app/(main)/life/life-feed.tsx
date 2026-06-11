"use client";

import { useState, useCallback } from "react";
import { LifeCard, type LifePostData } from "@/components/life/LifeCard";

type LifeFeedProps = {
  initialPosts: LifePostData[];
  initialPage: number;
  initialTotalPages: number;
};

export function LifeFeed({ initialPosts, initialPage, initialTotalPages }: LifeFeedProps) {
  const [posts, setPosts] = useState<LifePostData[]>(initialPosts);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);

  // 加载更多
  const loadMore = useCallback(async () => {
    if (loading || page >= totalPages) return;
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/life-posts?page=${nextPage}&pageSize=10`);
      const json = await res.json();
      if (json.success) {
        setPosts((prev) => [...prev, ...json.data]);
        setPage(nextPage);
        setTotalPages(json.pagination.totalPages);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, totalPages, loading]);

  // 删除后从列表中移除
  function handleDelete(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg className="h-16 w-16 text-[rgb(var(--border))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="mt-4 text-sm text-[rgb(var(--muted-foreground))]">
          还没有分享，快来发布第一条吧
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {posts.map((post) => (
          <LifeCard key={post.id} post={post} onDelete={handleDelete} />
        ))}
      </div>

      {/* 加载更多 */}
      {page < totalPages && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-6 py-2.5 text-sm font-medium transition-colors hover:bg-[rgb(var(--muted))] disabled:opacity-50"
          >
            {loading ? "加载中..." : "加载更多"}
          </button>
        </div>
      )}
    </div>
  );
}
