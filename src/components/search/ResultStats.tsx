"use client";

import { Loader2 } from "lucide-react";

/**
 * ResultStats · 搜索结果计数与耗时展示
 *  - 当 q / category 任一存在时显示
 *  - 显示总命中数 + 可选耗时
 *  - 加载中显示 spinner
 */
type Props = {
  total: number;
  tookMs?: number;
  isLoading?: boolean;
  isSearchMode: boolean;
  query?: string;
  category?: string;
  categoryLabel?: string;
};

export function ResultStats({
  total,
  tookMs,
  isLoading = false,
  isSearchMode,
  query,
  category,
  categoryLabel,
}: Props) {
  if (!isSearchMode) {
    return (
      <p className="text-sm text-[rgb(var(--muted-foreground))]">
        共 {total.toLocaleString("zh-CN")} 条
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {isLoading && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-bright" aria-hidden />
      )}
      <span className="font-medium text-[rgb(var(--foreground))]">
        {total > 0 ? (
          <>
            共 <span className="text-amber-bright">{total.toLocaleString("zh-CN")}</span> 条匹配结果
          </>
        ) : (
          <span className="text-[rgb(var(--muted-foreground))]">未找到匹配结果</span>
        )}
      </span>
      {typeof tookMs === "number" && (
        <span className="text-xs text-[rgb(var(--muted-foreground))]">
          · 耗时 {tookMs}ms
        </span>
      )}
      {query && (
        <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-xs text-amber-bright">
          「{query}」
        </span>
      )}
      {category && (
        <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2.5 py-0.5 text-xs">
          {categoryLabel || category}
        </span>
      )}
    </div>
  );
}
