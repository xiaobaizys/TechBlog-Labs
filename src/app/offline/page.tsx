"use client";

import Link from "next/link";
import { WifiOff, RefreshCw, Home } from "lucide-react";

/**
 * 离线页面
 *
 * 当用户离线时显示，提供基本的导航和重试功能。
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--background))] px-4">
      <div className="text-center">
        {/* 离线图标 */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[rgb(var(--muted))]">
          <WifiOff className="h-10 w-10 text-[rgb(var(--muted-foreground))]" />
        </div>

        {/* 标题 */}
        <h1 className="mb-2 text-2xl font-bold text-[rgb(var(--foreground))]">
          网络连接已断开
        </h1>

        {/* 描述 */}
        <p className="mb-8 text-[rgb(var(--muted-foreground))]">
          您当前处于离线状态，请检查网络连接后重试。
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-amber px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-bright"
          >
            <RefreshCw className="h-4 w-4" />
            重新加载
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-6 py-3 text-sm font-medium text-[rgb(var(--foreground))] transition-colors hover:border-amber hover:text-amber-bright"
          >
            <Home className="h-4 w-4" />
            返回首页
          </Link>
        </div>

        {/* 提示信息 */}
        <div className="mt-8 rounded-lg bg-[rgb(var(--muted))] p-4 text-sm text-[rgb(var(--muted-foreground))]">
          <p className="font-medium">提示</p>
          <p className="mt-1">
            部分已缓存的页面仍可访问，但某些功能可能受限。
          </p>
        </div>
      </div>
    </div>
  );
}
