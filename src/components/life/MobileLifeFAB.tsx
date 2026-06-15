"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

/**
 * 移动端发布分享悬浮按钮 (FAB)
 *
 * - 仅在 < 1024px 屏幕显示（桌面端顶部有固定按钮）
 * - 仅已登录用户可见
 * - 固定右下角，避免与 AI 按钮和 TOC-FAB 重叠
 */
export function MobileLifeFAB() {
  const { data: session } = useSession();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsVisible(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsVisible(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!isVisible || !session?.user) return null;

  return (
    <Link
      href="/life/new"
      className="fixed bottom-36 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-amber/40 bg-gradient-to-br from-amber to-amber-bright text-night shadow-lg shadow-amber/25 transition-transform hover:scale-105 active:scale-95 lg:hidden"
      aria-label="发布分享"
      title="发布分享"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 5v14m-7-7h14"
        />
      </svg>
    </Link>
  );
}
