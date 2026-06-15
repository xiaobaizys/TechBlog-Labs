"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TocEntry } from "@/lib/mdx";

type MobileTocFABProps = {
  toc: TocEntry[];
};

/**
 * 移动端目录浮动按钮 + 底部抽屉
 *
 * - 仅在 < 1024px 屏幕显示（桌面端由 TocSidebar 处理）
 * - 固定右下角 FAB，点击弹出底部抽屉
 * - 使用滚动监听精确追踪当前活跃标题
 */
export function MobileTocFAB({ toc }: MobileTocFABProps) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const headingElsRef = useRef<Map<string, HTMLElement>>(new Map());

  // 仅在 < lg 时显示
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsVisible(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsVisible(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 追踪活跃标题
  useEffect(() => {
    if (!isVisible) return;

    // 收集 DOM
    const map = new Map<string, HTMLElement>();
    for (const { id } of toc) {
      const el = document.getElementById(id);
      if (el) map.set(id, el);
    }
    headingElsRef.current = map;

    function updateActive() {
      let currentId = "";
      const scrollY = window.scrollY;
      const viewH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;

      if (scrollY + viewH >= docH - 100) {
        currentId = toc[toc.length - 1]?.id ?? "";
      } else {
        for (const { id } of toc) {
          const el = map.get(id);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= viewH * 0.5) {
            currentId = id;
            break;
          }
        }
        if (!currentId && toc.length > 0) {
          const firstEl = map.get(toc[0].id);
          if (firstEl && firstEl.getBoundingClientRect().top > viewH * 0.5) {
            currentId = toc[0].id;
          } else {
            for (let i = toc.length - 1; i >= 0; i--) {
              const el = map.get(toc[i].id);
              if (el && el.getBoundingClientRect().top <= 100) {
                currentId = toc[i].id;
                break;
              }
            }
          }
        }
      }

      setActiveId((prev) => (prev !== currentId ? currentId : prev));
    }

    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    return () => window.removeEventListener("scroll", updateActive);
  }, [toc, isVisible]);

  // 点击跳转
  const handleClick = useCallback((id: string) => {
    setOpen(false);
    setActiveId(id);
    // 小延迟确保抽屉关闭后再滚动
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.scrollBy(0, -80);
      }
    }, 200);
  }, []);

  if (!isVisible || toc.length === 0) return null;

  return (
    <>
      {/* FAB 按钮 */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-amber/40 bg-gradient-to-br from-amber to-amber-bright text-night shadow-lg shadow-amber/25 lg:hidden"
        aria-label={open ? "关闭目录" : "打开目录"}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {open ? (
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
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
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
        )}
      </motion.button>

      {/* 底部抽屉 */}
      <AnimatePresence>
        {open && (
          <>
            {/* 遮罩 */}
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* 抽屉面板 */}
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 max-h-[65vh] overflow-y-auto rounded-t-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] pb-[max(20px,env(safe-area-inset-bottom,20px))] shadow-2xl lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 40,
              }}
            >
              {/* 拖拽指示条 */}
              <div className="sticky top-0 z-10 bg-[rgb(var(--card))] pt-3 pb-2 px-5 border-b border-[rgb(var(--border))] rounded-t-2xl">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[rgb(var(--border))]" />
                <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">
                  目录
                </h3>
              </div>

              <nav className="px-5 py-3">
                <ul className="space-y-1 border-l-2 border-[rgb(var(--border))] pl-3">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleClick(item.id)}
                        className={`block w-full py-1.5 text-left text-sm transition-all duration-200 hover:text-amber-bright ${
                          item.level === 3 ? "pl-4 text-xs" : ""
                        } ${
                          activeId === item.id
                            ? "font-medium text-amber-bright -translate-x-px border-l-[2px] border-amber-bright -ml-[calc(0.75rem+2px)] pl-[calc(0.75rem+2px)]"
                            : "text-[rgb(var(--muted-foreground))]"
                        }`}
                      >
                        {item.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
