"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { setCache } from "@/lib/cache/indexedDB";

// ============================================================
// 常量
// ============================================================

const VISITED_KEY = "vitalog_visited";
const PRELOAD_URLS = [
  "/api/posts?page=1&pageSize=6",
  "/api/projects?isPublic=true&pageSize=3",
  "/api/life-posts?pageSize=3",
] as const;

// 加载阶段
type Phase = "idle" | "loading" | "complete";

// ============================================================
// Props
// ============================================================

type DataLoaderProps = {
  onComplete?: () => void;
  maxDuration?: number;
};

// ============================================================
// 首次访问判断（纯函数，SSR 安全）
// ============================================================

export function isFirstVisit(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(VISITED_KEY) !== "true";
  } catch {
    return false;
  }
}

export function markVisited(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VISITED_KEY, "true");
  } catch {
    // ignore
  }
}

// ============================================================
// 组件
// ============================================================

export function DataLoader({
  onComplete,
  maxDuration = 8000,
}: DataLoaderProps) {
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    markVisited();
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    let completedCount = 0;
    const totalUrls = PRELOAD_URLS.length;

    // 并行预取：后台静默填充 IndexedDB 缓存，不阻塞首屏内容渲染
    PRELOAD_URLS.forEach(async (url) => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          await setCache(url, data, 5 * 60 * 1000);
        }
      } catch {
        // 预取失败不影响主流程
      } finally {
        completedCount++;
        setProgress(Math.round((completedCount / totalUrls) * 100));

        if (completedCount >= totalUrls) {
          complete();
        }
      }
    });

    // 超时保护：即使预取失败也标记完成，避免顶部进度条长期占用
    const timeout = setTimeout(() => {
      complete();
    }, maxDuration);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 非阻塞式进度指示：固定在顶部的一根细线，不遮挡内容
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-transparent"
      aria-label="正在预加载数据"
      role="status"
    >
      <div
        className="h-full bg-amber transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
