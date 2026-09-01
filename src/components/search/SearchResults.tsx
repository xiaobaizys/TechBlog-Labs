"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Tag, Calendar, Eye } from "lucide-react";
import { HighlightText } from "./HighlightText";
import { SearchResultsSkeleton } from "./SearchResultsSkeleton";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  status: string;
  featured: boolean;
  viewCount: number;
  likeCount: number;
  publishedAt: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  highlight: Array<{
    text: string;
    hit: boolean;
  }> | null;
}

interface SearchResponse {
  success: boolean;
  data: SearchResult[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  query: {
    q: string | null;
    title: string | null;
    tag: string | null;
  };
  took: number;
}

interface SearchResultsProps {
  query: string;
  page: number;
}

export function SearchResults({ query, page }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          q: query,
          page: page.toString(),
          pageSize: "10",
        });

        const response = await fetch(`/api/search/fulltext?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("搜索失败");

        const data = await response.json();
        setResults(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "搜索失败");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    if (query) {
      fetchResults();
    } else {
      setLoading(false);
      setResults(null);
    }

    return () => controller.abort();
  }, [query, page]);

  // 加载中
  if (loading) {
    return <SearchResultsSkeleton />;
  }

  // 错误
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20">
        {error}
      </div>
    );
  }

  // 无结果 / 无 query
  if (!results || results.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgb(var(--border))] py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]">
          <Search className="h-7 w-7" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">
          {query ? "未找到相关文章" : "请输入关键词开始搜索"}
        </h3>
        <p className="max-w-sm text-sm text-[rgb(var(--muted-foreground))]">
          {query
            ? `没有匹配 "${query}" 的结果。试试更短或更通用的关键词。`
            : "在上方输入框输入关键词，搜索文章标题、内容、标签。"}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* 统计 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 text-sm text-[rgb(var(--muted-foreground))]">
        <p>
          找到 <span className="font-semibold text-[rgb(var(--foreground))]">{results.pagination.total}</span> 篇相关文章
          <span className="ml-1 text-xs opacity-70">耗时 {results.took}ms</span>
        </p>
        {results.pagination.totalPages > 1 && (
          <p>
            第 {results.pagination.page} / {results.pagination.totalPages} 页
          </p>
        )}
      </div>

      {/* 列表 */}
      <div className="space-y-5">
        {results.data.map((result) => (
          <SearchResultItem key={result.id} result={result} query={query} />
        ))}
      </div>

      {/* 分页 */}
      {results.pagination.totalPages > 1 && (
        <nav
          className="mt-8 flex flex-wrap justify-center gap-2"
          aria-label="分页"
        >
          {Array.from(
            { length: results.pagination.totalPages },
            (_, i) => i + 1
          ).map((pageNum) => {
            const isCurrent = pageNum === results.pagination.page;
            return (
              <Link
                key={pageNum}
                href={`/search?q=${encodeURIComponent(query)}&page=${pageNum}`}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-amber text-white shadow-sm"
                    : "border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright"
                }`}
                aria-current={isCurrent ? "page" : undefined}
              >
                {pageNum}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function SearchResultItem({
  result,
  query,
}: {
  result: SearchResult;
  query: string;
}) {
  const publishDate = result.publishedAt || result.createdAt;
  const date = new Date(publishDate);
  const formattedDate = date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="group rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 transition-all hover:border-amber/40 hover:shadow-amber">
      {/* 标题（带高亮） */}
      <Link href={`/blog/${result.slug}`} className="mb-3 block">
        <h2 className="text-xl font-semibold transition-colors group-hover:text-amber-bright">
          <HighlightText
            fragments={result.highlight}
            fallback={result.title}
          />
        </h2>
      </Link>

      {/* 摘要（带高亮） */}
      {result.highlight && result.highlight.length > 0 ? (
        <p className="mb-4 line-clamp-3 text-[rgb(var(--muted-foreground))]">
          <HighlightText
            fragments={result.highlight}
            fallback={result.excerpt ?? ""}
          />
        </p>
      ) : result.excerpt ? (
        <p className="mb-4 line-clamp-3 text-[rgb(var(--muted-foreground))]">
          {result.excerpt}
        </p>
      ) : null}

      {/* 标签 */}
      {result.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {result.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-1 text-xs font-medium transition-all hover:border-amber hover:text-amber-bright"
            >
              <Tag className="h-3 w-3" />
              {tag.name}
            </Link>
          ))}
        </div>
      )}

      {/* 元信息 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[rgb(var(--muted-foreground))]">
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          <time dateTime={publishDate}>{formattedDate}</time>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          <span>{result.viewCount.toLocaleString()} 次浏览</span>
        </div>
        {result.author.name && (
          <div className="flex items-center gap-1">
            <span>by {result.author.name}</span>
          </div>
        )}
      </div>
    </article>
  );
}
