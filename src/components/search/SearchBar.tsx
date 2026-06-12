"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Loader2, ChevronDown } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

/**
 * SearchBar · 通用搜索栏
 *
 * Props:
 *   - placeholder        输入框占位
 *   - type               "posts" | "projects"  决定建议接口和分类参数名
 *   - categories         分类下拉：[{ value, label, count? }]
 *   - categoryParam      写入 URL 的分类参数名（默认 "tag" / "tech"）
 *   - initialQuery       来自 URL 的初始 q
 *   - initialCategory    来自 URL 的初始 category
 *   - autoFocus          自动聚焦（默认 false）
 *
 * 行为：
 *   - 用户输入时拉取 /api/search/suggestions?type=...&q=...
 *   - 300ms debounce，loading 状态用 spinner
 *   - 提交（按 Enter 或点击「搜索」）→ 把 q / category 写入 URL 并跳转
 *   - 清空按钮：一键清除 q 和 category 并回到无筛选状态
 */
export type SearchCategory = { value: string; label: string; count?: number };

type SuggestionItem = { id: string; title: string; slug: string };

type Props = {
  type: "posts" | "projects";
  placeholder?: string;
  categories?: SearchCategory[];
  initialQuery?: string;
  initialCategory?: string;
  autoFocus?: boolean;
};

export function SearchBar({
  type,
  placeholder = "搜索…",
  categories = [],
  initialQuery = "",
  initialCategory = "",
  autoFocus = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [highlightIdx, setHighlightIdx] = useState<number>(-1);

  const debouncedQ = useDebounce(q, 300);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const categoryParam = type === "posts" ? "tag" : "tech";

  // ---------- 拉取建议 ----------
  useEffect(() => {
    const term = debouncedQ.trim();
    if (term.length === 0) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let aborted = false;
    setLoading(true);
    fetch(`/api/search/suggestions?type=${type}&q=${encodeURIComponent(term)}`)
      .then((r) => r.json())
      .then((res) => {
        if (aborted) return;
        setSuggestions(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!aborted) setSuggestions([]);
      })
      .finally(() => {
        if (!aborted) setLoading(false);
      });
    return () => {
      aborted = true;
    };
  }, [debouncedQ, type]);

  // ---------- 点击外部关闭建议 ----------
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlightIdx(-1);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ---------- 提交 ----------
  const submit = useCallback(
    (overrideQ?: string) => {
      const term = (overrideQ ?? q).trim();
      const params = new URLSearchParams();
      if (term) params.set("q", term);
      if (category) params.set(categoryParam, category);
      params.set("page", "1");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
      setOpen(false);
      setHighlightIdx(-1);
    },
    [q, category, categoryParam, pathname, router]
  );

  function clearAll() {
    setQ("");
    setCategory("");
    setSuggestions([]);
    setOpen(false);
    router.push(pathname);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightIdx((i) => Math.min(suggestions.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && highlightIdx >= 0 && suggestions[highlightIdx]) {
        // 直接跳到该文章/项目详情
        const item = suggestions[highlightIdx];
        const href = type === "posts" ? `/blog/${item.slug}` : `/projects/${item.slug}`;
        router.push(href);
        setOpen(false);
      } else {
        submit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIdx(-1);
    }
  }

  const showSuggestions = open && q.trim().length > 0;
  const hasAnyFilter = q.trim().length > 0 || category.length > 0;

  return (
    <div
      ref={wrapRef}
      className="theme-card relative flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-2"
      role="search"
    >
      {/* 关键词输入 */}
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted-foreground))]"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setHighlightIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="搜索关键词"
          className="h-10 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] pl-9 pr-9 text-sm text-[rgb(var(--foreground))] outline-none transition-all placeholder:text-[rgb(var(--muted-foreground))] focus:border-amber focus:ring-2 focus:ring-amber/30"
        />
        {loading ? (
          <Loader2
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[rgb(var(--muted-foreground))]"
            aria-hidden
          />
        ) : q.length > 0 ? (
          <button
            type="button"
            aria-label="清除关键词"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* 分类下拉 */}
      {categories.length > 0 ? (
        <div className="relative sm:w-48">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              // 立即提交
              setTimeout(() => {
                const term = q.trim();
                const params = new URLSearchParams();
                if (term) params.set("q", term);
                if (e.target.value) params.set(categoryParam, e.target.value);
                params.set("page", "1");
                const qs = params.toString();
                router.push(qs ? `${pathname}?${qs}` : pathname);
              }, 0);
            }}
            aria-label="按分类筛选"
            className="h-10 w-full appearance-none rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] pl-3 pr-8 text-sm text-[rgb(var(--foreground))] outline-none transition-all focus:border-amber focus:ring-2 focus:ring-amber/30"
          >
            <option value="">全部分类</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
                {typeof c.count === "number" ? ` (${c.count})` : ""}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted-foreground))]"
            aria-hidden
          />
        </div>
      ) : null}

      {/* 操作按钮 */}
      <div className="flex gap-2 sm:gap-2">
        <button
          type="button"
          onClick={() => submit()}
          className="btn-shimmer inline-flex h-10 flex-1 items-center justify-center gap-1.5 px-4 text-sm sm:flex-none"
          aria-label="搜索"
        >
          <Search className="h-4 w-4" />
          搜索
        </button>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-10 items-center gap-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-xs font-medium text-[rgb(var(--muted-foreground))] transition-all hover:border-amber hover:text-amber-bright"
            aria-label="清除全部筛选"
            title="清除全部筛选"
          >
            <X className="h-3.5 w-3.5" />
            清除
          </button>
        )}
      </div>

      {/* 建议下拉 */}
      {showSuggestions && (
        <div
          className="theme-card absolute left-3 right-3 top-full z-20 mt-2 max-h-80 overflow-auto rounded-lg border border-[rgb(var(--border))] p-1 shadow-lg sm:left-auto sm:right-auto sm:mt-1 sm:w-full sm:max-w-[calc(100%-1.5rem)]"
          role="listbox"
        >
          {loading && suggestions.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-[rgb(var(--muted-foreground))]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              正在搜索建议…
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[rgb(var(--muted-foreground))]">
              没有匹配的建议，试试其他关键词
            </div>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onMouseEnter={() => setHighlightIdx(i)}
                onMouseDown={(e) => e.preventDefault() /* prevent blur before click */}
                onClick={() => {
                  const href = type === "posts" ? `/blog/${s.slug}` : `/projects/${s.slug}`;
                  router.push(href);
                  setOpen(false);
                }}
                role="option"
                aria-selected={i === highlightIdx}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  i === highlightIdx
                    ? "bg-amber/15 text-amber-bright"
                    : "text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]"
                }`}
              >
                <Search className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="truncate">
                  <HighlightInSuggestion text={s.title} q={q} />
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * HighlightInSuggestion · 建议列表内对当前输入做高亮
 *  - 简单实现：不依赖 HighlightText，避免嵌套复杂组件
 */
function HighlightInSuggestion({ text, q }: { text: string; q: string }) {
  const term = q.trim();
  if (!term) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-amber/25 px-0.5 text-amber-bright">
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}
