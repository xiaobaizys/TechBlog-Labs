"use client";

import Link from "next/link";
import { SearchX, Sparkles } from "lucide-react";

/**
 * NoResults · 搜索无结果时的友好兜底
 *  - 居中插画 + 提示
 *  - 展示当前查询条件（去掉链接式高亮，纯文本）
 *  - 「猜你想搜」+ 热门标签 / 热门技术栈
 */
type Props = {
  title?: string;
  description?: string;
  query?: string;
  category?: string;
  recommendations?: { label: string; href: string; count?: number }[];
};

export function NoResults({
  title = "没有找到匹配的内容",
  description = "换个关键词或调整分类筛选试试",
  query,
  category,
  recommendations = [],
}: Props) {
  const hasQuery = (query && query.trim().length > 0) || (category && category.length > 0);
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card))]/40 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber/10 text-amber-bright">
        <SearchX className="h-7 w-7" strokeWidth={1.6} />
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-[rgb(var(--muted-foreground))]">
        {description}
      </p>

      {hasQuery && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-[rgb(var(--muted-foreground))]">
          <span>当前条件：</span>
          {query && (
            <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 font-medium text-amber-bright">
              关键词「{query}」
            </span>
          )}
          {category && (
            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2.5 py-0.5 font-medium">
              分类「{category}」
            </span>
          )}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="mt-6 w-full max-w-xl">
          <h4 className="mb-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted-foreground))]">
            <Sparkles className="h-3.5 w-3.5 text-amber-bright" />
            猜你想搜
          </h4>
          <div className="flex flex-wrap justify-center gap-2">
            {recommendations.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-xs font-medium transition-all hover:border-amber hover:text-amber-bright hover:shadow-sm"
              >
                {r.label}
                {typeof r.count === "number" && (
                  <span className="text-[rgb(var(--muted-foreground))]">({r.count})</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
