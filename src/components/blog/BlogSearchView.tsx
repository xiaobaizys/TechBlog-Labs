"use client";

import { BlogCard, type BlogCardPost } from "@/components/blog/BlogCard";
import { SearchBar, type SearchCategory } from "@/components/search/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { NoResults } from "@/components/search/NoResults";
import { ResultStats } from "@/components/search/ResultStats";

type Props = {
  posts: BlogCardPost[];
  pagination: { page: number; totalPages: number; total: number; pageSize: number };
  tags: SearchCategory[];
  activeQuery: string;
  activeTag: string;
  tookMs?: number;
};

export function BlogSearchView({
  posts,
  pagination,
  tags,
  activeQuery,
  activeTag,
  tookMs,
}: Props) {
  const isSearchMode = activeQuery.length > 0 || activeTag.length > 0;
  const showHighlight = isSearchMode;

  return (
    <div className="flex flex-col gap-10">
      {/* 搜索栏 */}
      <SearchBar
        type="posts"
        placeholder="按标题、摘要或正文搜索文章…"
        categories={tags}
        initialQuery={activeQuery}
        initialCategory={activeTag}
      />

      {/* 结果统计 */}
      <ResultStats
        total={pagination.total}
        tookMs={tookMs}
        isSearchMode={isSearchMode}
        query={activeQuery}
        category={activeTag}
        categoryLabel={tags.find((t) => t.value === activeTag)?.label}
      />

      {/* 结果列表 / 空态 */}
      {posts.length === 0 ? (
        isSearchMode ? (
          <NoResults
            query={activeQuery}
            category={tags.find((t) => t.value === activeTag)?.label}
            recommendations={tags.slice(0, 8).map((t) => ({
              label: t.label,
              href: `/blog?tag=${t.value}`,
              count: t.count,
            }))}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg
              className="h-16 w-16 text-[rgb(var(--border))]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
            <p className="mt-4 text-[rgb(var(--muted-foreground))]">暂无文章</p>
          </div>
        )
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} showHighlight={showHighlight} />
            ))}
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} />
        </>
      )}
    </div>
  );
}
