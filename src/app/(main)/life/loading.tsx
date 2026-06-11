/**
 * /life loading 骨架屏
 */
export default function LifeLoading() {
  return (
    <div className="mx-auto max-w-2xl px-5 md:px-10 py-16">
      {/* 标题栏骨架 */}
      <div className="mb-10 flex items-center justify-between">
        <div className="space-y-3">
          <div className="h-3 w-16 animate-pulse rounded bg-[rgb(var(--muted))]" />
          <div className="h-8 w-32 animate-pulse rounded bg-[rgb(var(--muted))]" />
          <div className="h-4 w-40 animate-pulse rounded bg-[rgb(var(--muted))]" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-[rgb(var(--muted))]" />
      </div>

      {/* 分享卡骨架 */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="theme-card p-5" aria-hidden>
            {/* 头部 */}
            <div className="mb-3 flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-[rgb(var(--muted))]" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-20 animate-pulse rounded bg-[rgb(var(--muted))]" />
                <div className="h-3 w-14 animate-pulse rounded bg-[rgb(var(--muted))]" />
              </div>
            </div>
            {/* 内容 */}
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-[rgb(var(--muted))]" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-[rgb(var(--muted))]" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-[rgb(var(--muted))]" />
            </div>
            {/* 图片占位 */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="h-20 animate-pulse rounded bg-[rgb(var(--muted))]" />
              <div className="h-20 animate-pulse rounded bg-[rgb(var(--muted))]" />
              <div className="h-20 animate-pulse rounded bg-[rgb(var(--muted))]" />
            </div>
            {/* 底部 */}
            <div className="mt-4 flex items-center gap-4">
              <div className="h-4 w-12 animate-pulse rounded bg-[rgb(var(--muted))]" />
              <div className="h-4 w-12 animate-pulse rounded bg-[rgb(var(--muted))]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
