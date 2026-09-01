"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

interface SearchBoxProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export function SearchBox({ className = "", placeholder = "搜索文章...", onSearch }: SearchBoxProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 从 URL 同步 query
  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    setQuery(urlQuery);
  }, [searchParams]);

  // 全局快捷键 ⌘K / Ctrl+K 聚焦
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 点击外部失焦
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (onSearch) {
      onSearch(trimmed);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`} role="search">
      <div ref={containerRef} className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted-foreground))]"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] py-2.5 pl-10 pr-20 text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] transition-all focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
          aria-label="搜索"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-10 top-1/2 -translate-y-1/2 rounded-md p-1 text-[rgb(var(--muted-foreground))] transition-colors hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
            aria-label="清除搜索"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 rounded border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-1.5 py-0.5 font-mono text-[10px] text-[rgb(var(--muted-foreground))] sm:inline-flex">
          ⌘K
        </kbd>
      </div>
    </form>
  );
}

/**
 * CompactSearchBox · 紧凑版（导航栏使用）
 *
 *  - 与 SearchBox 共用样式
 *  - 默认宽度小，hover/focus 展开
 */
export function CompactSearchBox({ className = "" }: { className?: string }) {
  return (
    <div className={`vitalog-topbar__search ${className}`}>
      <SearchBox
        placeholder="搜索..."
        className="vitalog-topbar__search-form"
      />
    </div>
  );
}
