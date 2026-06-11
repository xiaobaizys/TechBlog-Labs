"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, ArrowLeft } from "lucide-react";

/**
 * /admin 错误兜底（Error Boundary）
 *
 *  - 与主站 error.tsx 区分样式：管理后台更克制（不要 500 大字）
 *  - requireAdmin() 抛错 / 子页面异常都会路由到这里
 *  - 不暴露内部错误细节给非终端用户
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminErrorBoundary]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-12">
      <div className="theme-card w-full p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-200/60 bg-rose-50 text-rose-600">
            <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-xl font-semibold text-[rgb(var(--foreground))]">
              管理后台出错了
            </h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
              这次操作没能完成。你可以重试，或先回后台首页。
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-[10px] tracking-wider text-[rgb(var(--muted-foreground))]/70">
                错误 ID：{error.digest}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-bright"
          >
            <RotateCw className="h-3.5 w-3.5" strokeWidth={2.2} />
            重试
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[rgb(var(--border))] px-4 py-2 text-sm font-medium text-[rgb(var(--muted-foreground))] transition-colors hover:border-amber-bright/50 hover:text-amber-bright"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
            返回后台首页
          </Link>
        </div>
      </div>
    </div>
  );
}
