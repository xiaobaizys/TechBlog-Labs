import { Skeleton } from '@/components/ui/Skeleton'

/**
 * 博客卡片骨架屏
 *
 * 布局结构与 BlogCard 保持一致，避免 LCP 布局偏移：
 * - 封面占位 (h-48)
 * - 标签 pill × 3
 * - 标题行 × 2
 * - 摘要行 × 2
 * - 底部作者 + 日期 + 统计
 */
export function BlogCardSkeleton() {
  return (
    <article className="theme-card overflow-hidden h-full flex flex-col">
      {/* 封面占位 */}
      <Skeleton className="h-48 w-full !rounded-none" />

      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* 标签 */}
        <div className="flex gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>

        {/* 标题 */}
        <Skeleton className="h-6 w-full rounded" />
        <Skeleton className="h-6 w-3/4 rounded" />

        {/* 摘要 */}
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />

        {/* 底部 */}
        <div className="mt-auto pt-4 flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
          <div className="ml-auto flex gap-3">
            <Skeleton className="h-3 w-10 rounded" />
            <Skeleton className="h-3 w-10 rounded" />
          </div>
        </div>
      </div>
    </article>
  )
}
