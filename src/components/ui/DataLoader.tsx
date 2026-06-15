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
  minDuration?: number;
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
  minDuration = 800,
  maxDuration = 8000,
}: DataLoaderProps) {
  const [progress, setProgress] = useState(0);
  const startTime = useRef(Date.now());
  const completedRef = useRef(false);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    markVisited();
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    startTime.current = Date.now();

    let completedCount = 0;
    const totalUrls = PRELOAD_URLS.length;

    const tryComplete = () => {
      const elapsed = Date.now() - startTime.current;
      if (elapsed < minDuration) {
        setTimeout(complete, minDuration - elapsed);
      } else {
        complete();
      }
    };

    // 并行预取
    PRELOAD_URLS.forEach(async (url) => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          await setCache(url, data, 5 * 60 * 1000);
        }
      } catch {
        // 预取失败不影响
      } finally {
        completedCount++;
        setProgress(Math.round((completedCount / totalUrls) * 100));

        if (completedCount >= totalUrls) {
          tryComplete();
        }
      }
    });

    // 超时保护
    const timeout = setTimeout(() => {
      tryComplete();
    }, maxDuration);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 加载画面 ----
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[rgb(var(--background))]"
      aria-label="正在加载生息日志"
      role="status"
    >
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-amber/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full border border-amber/10 animate-ping" />
      </div>

      {/* 主内容 */}
      <div className="relative z-10 text-center space-y-8">
        <div className="space-y-3">
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-foreground">
            生息日志
            <span className="mx-1 text-amber">·</span>
            <span className="text-amber">VitaLog</span>
          </h1>
          <p className="text-xs tracking-[0.3em] text-[rgb(var(--muted-foreground))] uppercase font-mono">
            — Twelve Shichen —
          </p>
        </div>

        {/* 进度条 */}
        <div className="mx-auto w-48">
          <div className="h-0.5 w-full rounded-full bg-[rgb(var(--border))] overflow-hidden">
            <div
              className="h-full bg-amber transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-[rgb(var(--muted-foreground))] font-mono">
            正在加载···
          </p>
        </div>
      </div>
    </div>
  );
}
