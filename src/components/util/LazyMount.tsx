"use client";

import { useEffect, useRef, useState } from "react";

/**
 * LazyMount · 进入视口前不渲染 children
 *
 *  - 用途：把"远在视口外才出现"的组件延后挂载，节省首屏 JS / DOM 开销
 *  - 触发：IntersectionObserver，rootMargin 默认 600px（提前预热）
 *  - 触发后断连，children 持久保留（不会卸载）
 *  - 占位高度由 minHeight 控制，避免布局抖动
 *  - prefers-reduced-motion 不影响触发逻辑
 */
export function LazyMount({
  children,
  rootMargin = "600px 0px",
  minHeight = "100vh",
  fallback = null,
  className,
}: {
  children: React.ReactNode;
  rootMargin?: string;
  minHeight?: string;
  fallback?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shouldMount) return;
    // 浏览器不支持 IO 时立即挂载
    if (typeof IntersectionObserver === "undefined") {
      setShouldMount(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldMount(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, shouldMount]);

  return (
    <div
      ref={ref}
      className={className}
      style={shouldMount ? undefined : { minHeight }}
    >
      {shouldMount ? children : fallback}
    </div>
  );
}

/**
 * LazyOnIdle · requestIdleCallback 触发后挂载
 *
 *  - 用途：纯装饰性（尘埃粒子）等不影响阅读的组件
 *  - 浏览器空闲时挂载，fallback 是 null（不占位）
 *  - 不支持 rIC 的环境降级为 setTimeout 200ms
 */
export function LazyOnIdle({
  children,
  timeout = 1500,
}: {
  children: React.ReactNode;
  timeout?: number;
}) {
  const [shouldMount, setShouldMount] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout?: number }) => number)
      | undefined;
    if (ric) {
      const id = ric(() => setShouldMount(true), { timeout });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setShouldMount(true), 200);
    return () => window.clearTimeout(id);
  }, [timeout]);
  return <>{shouldMount ? children : null}</>;
}
