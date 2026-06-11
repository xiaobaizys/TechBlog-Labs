"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type PaginationProps = {
  page: number;
  totalPages: number;
};

export function Pagination({ page, totalPages }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function buildUrl(p: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  }

  // 生成页码数组
  const pages: (number | "...")[] = [];
  const delta = 2; // 当前页前后各显示 2 页

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - delta && i <= page + delta)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1 pt-8" aria-label="分页导航">
      {/* 上一页 */}
      {page > 1 ? (
        <Link
          href={buildUrl(page - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--border))] text-sm transition-colors hover:bg-[rgb(var(--muted))]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--border))] text-sm opacity-40 cursor-not-allowed">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </span>
      )}

      {/* 页码 */}
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="flex h-9 w-9 items-center justify-center text-sm text-[rgb(var(--muted-foreground))]"
          >
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={buildUrl(p)}
            className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
              p === page
                ? "border-amber bg-amber/15 text-amber-bright"
                : "border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]"
            }`}
          >
            {p}
          </Link>
        )
      )}

      {/* 下一页 */}
      {page < totalPages ? (
        <Link
          href={buildUrl(page + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--border))] text-sm transition-colors hover:bg-[rgb(var(--muted))]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--border))] text-sm opacity-40 cursor-not-allowed">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      )}
    </nav>
  );
}
