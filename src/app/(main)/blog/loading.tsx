/**
 * /blog loading 骨架屏
 *
 *  Next.js App Router 的约定：路由级 loading.tsx 会自动包在页面外层
 *  <Suspense> 边界里。每次切换 /blog 路由（或翻页）期间展示，
 *  数据 ready 后无缝替换，体验比"白屏等"好很多。
 *
 *  样式：复刻 BlogCard 的几何（封面+文本），用脉冲动画暗示加载中
 */
export default function BlogLoading() {
  return (
    <div className="mx-auto max-w-6xl px-5 md:px-10 lg:px-20 py-16">
      {/* 标题骨架 */}
      <div className="mb-10 space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-[rgb(var(--muted))]" />
        <div className="h-9 w-48 animate-pulse rounded bg-[rgb(var(--muted))]" />
        <div className="h-4 w-64 animate-pulse rounded bg-[rgb(var(--muted))]" />
      </div>

      <div className="flex flex-col gap-12 lg:flex-row">
        {/* 主内容区 */}
        <div className="flex-1">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="theme-card overflow-hidden"
                aria-hidden
              >
                {/* 封面图占位 */}
                <div className="h-48 w-full animate-pulse bg-[rgb(var(--muted))]" />
                <div className="p-5 space-y-3">
                  {/* 标签占位 */}
                  <div className="flex gap-2">
                    <div className="h-5 w-12 animate-pulse rounded-full bg-[rgb(var(--muted))]" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-[rgb(var(--muted))]" />
                  </div>
                  {/* 标题 */}
                  <div className="h-5 w-full animate-pulse rounded bg-[rgb(var(--muted))]" />
                  <div className="h-5 w-3/4 animate-pulse rounded bg-[rgb(var(--muted))]" />
                  {/* 摘要 */}
                  <div className="space-y-1.5">
                    <div className="h-3 w-full animate-pulse rounded bg-[rgb(var(--muted))]" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-[rgb(var(--muted))]" />
                  </div>
                  {/* 作者 + 时间 */}
                  <div className="flex items-center gap-2 pt-2">
                    <div className="h-6 w-6 animate-pulse rounded-full bg-[rgb(var(--muted))]" />
                    <div className="h-3 w-20 animate-pulse rounded bg-[rgb(var(--muted))]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 侧边栏骨架 */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="sticky top-24 space-y-4">
            <div className="h-3 w-20 animate-pulse rounded bg-[rgb(var(--muted))]" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-7 w-16 animate-pulse rounded-full bg-[rgb(var(--muted))]"
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
