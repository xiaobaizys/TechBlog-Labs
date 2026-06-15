import { BlogCardSkeleton } from '@/components/blog/BlogCardSkeleton'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * /blog loading 骨架屏
 *
 *  Next.js App Router 的约定：路由级 loading.tsx 会自动包在页面外层
 *  <Suspense> 边界里。每次切换 /blog 路由（或翻页）期间展示，
 *  数据 ready 后无缝替换，体验比"白屏等"好很多。
 */
export default function BlogLoading() {
  return (
    <div className="mx-auto max-w-6xl px-5 md:px-10 lg:px-20 py-16">
      {/* 标题骨架 */}
      <div className="mb-10 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="flex flex-col gap-12 lg:flex-row">
        {/* 主内容区 */}
        <div className="flex-1">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <BlogCardSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* 侧边栏骨架 */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="sticky top-24 space-y-4">
            <Skeleton className="h-3 w-20" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-16 rounded-full" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
