"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { rafThrottle, addPassiveEventListener } from "@/lib/performance";
import type { TocEntry } from "@/lib/mdx";

type TocSidebarProps = {
  toc: TocEntry[];
};

/**
 * 桌面端 TOC 侧边栏（优化版）
 *
 * 性能优化：
 * - IntersectionObserver：原生 API，性能优于 scroll 事件
 * - requestAnimationFrame：与浏览器渲染同步，避免卡顿
 * - 被动事件监听：{ passive: true } 不阻塞滚动
 * - 节流更新：避免频繁 DOM 操作
 */
export function TocSidebar({ toc }: TocSidebarProps) {
  const [activeId, setActiveId] = useState("");
  const [readingProgress, setReadingProgress] = useState(0);
  const headingElsRef = useRef<Map<string, HTMLElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibleHeadingsRef = useRef<Set<string>>(new Set());
  const rafIdRef = useRef<number | null>(null);

  // 初始化 IntersectionObserver
  useEffect(() => {
    // 收集所有标题 DOM 元素
    const map = new Map<string, HTMLElement>();
    for (const { id } of toc) {
      const el = document.getElementById(id);
      if (el) map.set(id, el);
    }
    headingElsRef.current = map;

    // 使用 IntersectionObserver 检测标题可见性
    // 性能优势：浏览器原生实现，无需手动计算位置
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // 更新可见标题集合
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleHeadingsRef.current.add(entry.target.id);
          } else {
            visibleHeadingsRef.current.delete(entry.target.id);
          }
        });

        // 使用 requestAnimationFrame 节流更新
        // 性能优势：与浏览器渲染同步，避免在帧之间频繁更新
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }

        rafIdRef.current = requestAnimationFrame(() => {
          // 找到当前可见的第一个标题
          const visibleArray = Array.from(visibleHeadingsRef.current);
          if (visibleArray.length > 0) {
            // 按照 toc 顺序排序，取第一个
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
        // 视口顶部偏移 100px，给标题一些缓冲空间
        rootMargin: "-100px 0px -60% 0px",
        threshold: 0,
      }
    );

    // 观察所有标题
    map.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [toc]);

  // 计算阅读进度
  useEffect(() => {
    // 使用 rafThrottle 包装更新函数
    // 性能优势：自动节流，与浏览器渲染同步
    const updateProgress = rafThrottle(() => {
      const scrollY = window.scrollY;
      const viewH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;

      // 计算阅读进度（排除视口高度）
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
    // 性能优势：不调用 preventDefault()，浏览器可以优化滚动
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
  }, [toc]);

  // 点击跳转
  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      // 平滑滚动
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // 偏移顶部间距
      window.scrollBy(0, -100);
      // 更新高亮
      setActiveId(id);
      // 更新 URL hash（不触发页面跳转）
      window.history.pushState(null, "", `#${id}`);
    }
  }, []);

  if (toc.length === 0) return null;

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <nav className="sticky top-24">
        {/* 目录容器 - 毛玻璃效果 + 最大高度 */}
        <div className="rounded-xl border border-[rgb(var(--border))]/50 bg-[rgb(var(--card))]/80 backdrop-blur-sm p-4 max-h-[70vh] overflow-y-auto">
          {/* 标题 + 阅读进度 */}
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted-foreground))]">
              目录
            </h4>
            <span className="text-xs font-mono text-amber-bright">
              {readingProgress}%
            </span>
          </div>

          {/* 进度条 */}
          <div className="mb-4 h-1 w-full rounded-full bg-[rgb(var(--muted))]">
            <div
              className="h-1 rounded-full bg-amber transition-all duration-300 ease-out"
              style={{ width: `${readingProgress}%` }}
            />
          </div>

          {/* 目录列表 */}
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
                      group flex w-full items-center py-1.5 text-left text-sm transition-all duration-200
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

          {/* 底部提示 */}
          <div className="mt-4 pt-3 border-t border-[rgb(var(--border))]/50">
            <p className="text-[10px] text-[rgb(var(--muted-foreground))]/60 text-center">
              共 {toc.length} 个章节
            </p>
          </div>
        </div>
      </nav>
    </aside>
  );
}
