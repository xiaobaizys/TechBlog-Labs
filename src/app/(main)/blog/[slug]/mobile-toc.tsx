"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { rafThrottle, addPassiveEventListener } from "@/lib/performance";
import type { TocEntry } from "@/lib/mdx";

type MobileTocFABProps = {
  toc: TocEntry[];
};

/**
 * 移动端目录浮动按钮 + 底部抽屉（优化版）
 *
 * 性能优化：
 * - IntersectionObserver：原生 API，性能优于 scroll 事件
 * - requestAnimationFrame：与浏览器渲染同步，避免卡顿
 * - 被动事件监听：{ passive: true } 不阻塞滚动
 * - 节流更新：避免频繁 DOM 操作
 */
export function MobileTocFAB({ toc }: MobileTocFABProps) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [readingProgress, setReadingProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const headingElsRef = useRef<Map<string, HTMLElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibleHeadingsRef = useRef<Set<string>>(new Set());
  const rafIdRef = useRef<number | null>(null);

  // 仅在 < lg 时显示
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsVisible(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsVisible(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 初始化 IntersectionObserver
  useEffect(() => {
    if (!isVisible || toc.length === 0) return;

    // 收集 DOM
    const map = new Map<string, HTMLElement>();
    for (const { id } of toc) {
      const el = document.getElementById(id);
      if (el) map.set(id, el);
    }
    headingElsRef.current = map;

    // 使用 IntersectionObserver 检测标题可见性
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleHeadingsRef.current.add(entry.target.id);
          } else {
            visibleHeadingsRef.current.delete(entry.target.id);
          }
        });

        // 使用 requestAnimationFrame 节流更新
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }

        rafIdRef.current = requestAnimationFrame(() => {
          const visibleArray = Array.from(visibleHeadingsRef.current);
          if (visibleArray.length > 0) {
            const firstVisible = toc.find((item) =>
              visibleHeadingsRef.current.has(item.id)
            );
            if (firstVisible) {
              setActiveId(firstVisible.id);
            }
          }
          rafIdRef.current = null;
        });
      },
      {
        rootMargin: "-100px 0px -60% 0px",
        threshold: 0,
      }
    );

    map.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [toc, isVisible]);

  // 计算阅读进度
  useEffect(() => {
    if (!isVisible) return;

    // 使用 rafThrottle 包装更新函数
    const updateProgress = rafThrottle(() => {
      const scrollY = window.scrollY;
      const viewH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;

      const progress = Math.min(
        Math.max((scrollY / (docH - viewH)) * 100, 0),
        100
      );

      setReadingProgress(Math.round(progress));

      // 页面底部：高亮最后一个标题
      if (scrollY + viewH >= docH - 100) {
        setActiveId(toc[toc.length - 1]?.id ?? "");
      }
      // 页面顶部：高亮第一个标题
      else if (scrollY < 100) {
        setActiveId(toc[0]?.id ?? "");
      }
    });

    // 使用被动事件监听
    const removeListener = addPassiveEventListener(
      window,
      "scroll",
      updateProgress
    );

    // 初始计算
    updateProgress();

    return () => {
      removeListener();
    };
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
        window.scrollBy(0, -100);
        // 更新 URL hash
        window.history.pushState(null, "", `#${id}`);
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
          <div className="flex flex-col items-center">
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
            {/* 进度指示器 */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-night text-[8px] font-bold text-amber">
              {readingProgress}
            </span>
          </div>
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
              className="fixed inset-x-0 bottom-0 z-50 max-h-[65vh] overflow-y-auto rounded-t-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]/95 backdrop-blur-md pb-[max(20px,env(safe-area-inset-bottom,20px))] shadow-2xl lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 40,
              }}
            >
              {/* 拖拽指示条 + 标题 */}
              <div className="sticky top-0 z-10 bg-[rgb(var(--card))]/95 backdrop-blur-md pt-3 pb-2 px-5 border-b border-[rgb(var(--border))] rounded-t-2xl">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[rgb(var(--border))]" />
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">
                    目录
                  </h3>
                  <span className="text-xs font-mono text-amber-bright">
                    已读 {readingProgress}%
                  </span>
                </div>

                {/* 进度条 */}
                <div className="mt-2 h-1 w-full rounded-full bg-[rgb(var(--muted))]">
                  <div
                    className="h-1 rounded-full bg-amber transition-all duration-300 ease-out"
                    style={{ width: `${readingProgress}%` }}
                  />
                </div>
              </div>

              {/* 目录列表 */}
              <nav className="px-5 py-3">
                <ul className="space-y-0.5">
                  {toc.map((item) => {
                    const isActive = activeId === item.id;
                    const indentClass =
                      item.level === 3
                        ? "pl-6"
                        : item.level === 4
                        ? "pl-9"
                        : "";

                    return (
                      <li key={item.id} className="relative">
                        <button
                          onClick={() => handleClick(item.id)}
                          className={`
                            flex w-full items-center py-2 text-left text-sm transition-all duration-200
                            ${indentClass}
                            ${
                              isActive
                                ? "text-amber-bright font-medium"
                                : "text-[rgb(var(--muted-foreground))] hover:text-amber-bright"
                            }
                          `}
                        >
                          {/* 高亮竖条标记 */}
                          {isActive && (
                            <span className="absolute left-0 h-5 w-0.5 rounded-full bg-amber" />
                          )}

                          {/* 文本 */}
                          <span
                            className={`truncate ${
                              item.level === 3 ? "text-xs" : ""
                            } ${item.level === 4 ? "text-[11px]" : ""}`}
                          >
                            {item.text}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* 底部信息 */}
              <div className="px-5 py-3 border-t border-[rgb(var(--border))]">
                <p className="text-[10px] text-[rgb(var(--muted-foreground))]/60 text-center">
                  共 {toc.length} 个章节 · 点击跳转到对应位置
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
