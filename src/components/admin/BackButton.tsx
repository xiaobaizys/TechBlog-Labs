"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * BackButton · 管理后台通用「返回上一页」按钮
 *
 * 行为：
 *  - 默认调用 router.back() 走浏览器历史
 *  - 当没有历史可回（直接打开的页面 / history.length <= 1）时，
 *    fallback 到 /admin，避免在部分浏览器中「卡住空白页」
 *
 * 视觉：
 *  - 与 AdminTopBar 中「查看前台」按钮保持同一调色板和尺寸
 *  - 移动端只显示图标，桌面端显示「返回」文字
 *  - focus-visible 状态有 ring，便于键盘访问
 */
export function BackButton() {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/admin");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="返回上一页"
      title="返回上一页"
      className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--muted-foreground))] transition-all hover:border-amber hover:bg-amber/10 hover:text-amber-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[rgb(var(--background))] sm:px-3 sm:text-sm"
    >
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
      <span className="hidden sm:inline">返回</span>
    </button>
  );
}
