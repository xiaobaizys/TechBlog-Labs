/**
 * 搜索结果骨架组件
 *
 * 用于加载状态显示
 */
export function SearchResultsSkeleton() {
  return (
    <div>
      {/* 搜索统计骨架 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-4 w-48 bg-[rgb(var(--muted))]/20 rounded animate-pulse" />
        <div className="h-4 w-24 bg-[rgb(var(--muted))]/20 rounded animate-pulse" />
      </div>

      {/* 搜索结果列表骨架 */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 animate-pulse"
          >
            {/* 标题骨架 */}
            <div className="h-6 w-3/4 bg-[rgb(var(--muted))]/20 rounded mb-3" />

            {/* 摘要骨架 */}
            <div className="space-y-2 mb-4">
              <div className="h-4 w-full bg-[rgb(var(--muted))]/20 rounded" />
              <div className="h-4 w-5/6 bg-[rgb(var(--muted))]/20 rounded" />
              <div className="h-4 w-4/6 bg-[rgb(var(--muted))]/20 rounded" />
            </div>

            {/* 标签骨架 */}
            <div className="flex gap-2 mb-4">
              <div className="h-6 w-16 bg-[rgb(var(--muted))]/20 rounded-full" />
              <div className="h-6 w-20 bg-[rgb(var(--muted))]/20 rounded-full" />
              <div className="h-6 w-14 bg-[rgb(var(--muted))]/20 rounded-full" />
            </div>

            {/* 元信息骨架 */}
            <div className="flex items-center gap-4">
              <div className="h-4 w-24 bg-[rgb(var(--muted))]/20 rounded" />
              <div className="h-4 w-20 bg-[rgb(var(--muted))]/20 rounded" />
              <div className="h-4 w-16 bg-[rgb(var(--muted))]/20 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* 分页骨架 */}
      <div className="mt-8 flex justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-10 bg-[rgb(var(--muted))]/20 rounded-lg animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
