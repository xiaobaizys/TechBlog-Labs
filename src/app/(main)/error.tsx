"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, Home } from "lucide-react";

/**
 * 主站错误兜底（Error Boundary）
 *
 *  - App Router 约定：error.tsx 必须是 Client Component
 *  - 任何子组件（含 layout）抛出的未捕获错误都会路由到这里
 *  - 提供「重试 / 回首页」两个操作，避免白屏卡死
 *  - 不打印敏感错误到 DOM；error.message 在 dev 模式由 Next 自动显示
 */
export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 上报到控制台；后续可接入 Sentry / 自家埋点
    console.error("[MainErrorBoundary]", error);
  }, [error]);

  return (
    <main className="vitalog-home flex min-h-[calc(100vh-12rem)] items-center justify-center px-5 py-20">
      <div className="theme-card relative w-full max-w-xl overflow-hidden p-10 text-center sm:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 select-none font-serif text-[10rem] font-bold leading-none text-rose-400/10 sm:text-[14rem]"
        >
          500
        </div>

        <div className="relative">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-200/50 bg-rose-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.25em] text-rose-600">
            <AlertTriangle className="h-3 w-3" strokeWidth={2.4} />
            Something Went Wrong
          </p>

          <h1 className="font-serif text-4xl font-semibold tracking-tight text-[rgb(var(--foreground))] sm:text-5xl">
            出了点小状况
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--muted-foreground))] sm:text-base">
            页面渲染时遇到一个意外错误。已自动记录到控制台，
            <br className="hidden sm:block" />
            你可以重试一次，或返回首页继续浏览。
          </p>

          {error.digest && (
            <p className="mt-3 font-mono text-[10px] tracking-wider text-[rgb(var(--muted-foreground))]/70">
              错误 ID：{error.digest}
            </p>
          )}

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-amber-bright hover:shadow-md sm:w-auto"
            >
              <RotateCw className="h-4 w-4" strokeWidth={2.2} />
              重试一次
            </button>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-2.5 text-sm font-medium text-[rgb(var(--muted-foreground))] transition-all hover:border-amber-bright/50 hover:text-amber-bright sm:w-auto"
            >
              <Home className="h-4 w-4" strokeWidth={2.2} />
              回到首页
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
