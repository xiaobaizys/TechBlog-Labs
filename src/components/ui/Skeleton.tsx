'use client'

/**
 * 通用骨架屏组件
 *
 * 使用 animate-pulse + bg-muted 实现加载态闪烁效果。
 * className 传入自定义宽高/间距。
 *
 * @example
 *   <Skeleton className="h-4 w-48 rounded" />
 *   <Skeleton className="h-8 w-full rounded-lg" />
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[rgb(var(--muted))] ${className ?? ''}`}
      aria-hidden="true"
    />
  )
}
