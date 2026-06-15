"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PopularPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  viewCount: number;
  likeCount: number;
};

type PopularPostsPanelProps = {
  /** 是否在侧边栏中显示（桌面端） */
  sidebar?: boolean;
};

export function PopularPostsPanel({ sidebar = true }: PopularPostsPanelProps) {
  const [posts, setPosts] = useState<PopularPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchPopular() {
      try {
        const res = await fetch("/api/posts/popular?limit=5");
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        if (!cancelled && json.success) {
          setPosts(json.data);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPopular();
    return () => {
      cancelled = true;
    };
  }, []);

  // 加载骨架
  if (loading) {
    return (
      <div
        className={sidebar ? "mt-8 hidden lg:block" : ""}
        aria-label="热门文章加载中"
      >
        {sidebar && (
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted-foreground))]">
            热门文章
          </h4>
        )}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold text-[rgb(var(--muted-foreground))]">
                  {i + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-full rounded bg-[rgb(var(--muted))]" />
                  <div className="h-3 w-16 rounded bg-[rgb(var(--muted))]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || posts.length === 0) return null;

  return (
    <div className={`popular-posts ${sidebar ? "mt-8 hidden lg:block" : ""}`}>
      {sidebar && (
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted-foreground))]">
          热门文章
        </h4>
      )}
      <ul className="space-y-2.5">
        {posts.map((post, i) => (
          <li key={post.id}>
            <Link
              href={`/blog/${post.slug}`}
              className="group flex items-start gap-2"
            >
              {/* 排名数字 */}
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold tabular-nums ${
                  i < 3
                    ? "bg-amber-bright/15 text-amber-bright"
                    : "text-[rgb(var(--muted-foreground))]"
                }`}
              >
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                {/* 标题 */}
                <p className="truncate text-sm text-[rgb(var(--foreground))] transition-colors group-hover:text-amber-bright leading-snug">
                  {post.title}
                </p>
                {/* 阅读量 */}
                <span className="text-[11px] text-[rgb(var(--muted-foreground))] leading-none">
                  {formatCount(post.viewCount)} 阅读
                  {post.likeCount > 0 && (
                    <> · {formatCount(post.likeCount)} 赞</>
                  )}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
