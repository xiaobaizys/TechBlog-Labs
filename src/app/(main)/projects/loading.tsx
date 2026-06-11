/**
 * /projects loading 骨架屏
 */
export default function ProjectsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-5 md:px-10 lg:px-20 py-16">
      {/* 标题骨架 */}
      <div className="mb-10 space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-[rgb(var(--muted))]" />
        <div className="h-9 w-56 animate-pulse rounded bg-[rgb(var(--muted))]" />
        <div className="h-4 w-72 animate-pulse rounded bg-[rgb(var(--muted))]" />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* 侧边栏骨架 */}
        <aside className="w-full shrink-0 lg:w-56">
          <div className="sticky top-24 space-y-3">
            <div className="h-3 w-20 animate-pulse rounded bg-[rgb(var(--muted))]" />
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-full animate-pulse rounded-lg bg-[rgb(var(--muted))]"
                />
              ))}
            </div>
          </div>
        </aside>

        {/* 项目卡骨架（3列 × 2行） */}
        <div className="flex-1">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="theme-card overflow-hidden"
                aria-hidden
              >
                <div className="h-40 w-full animate-pulse bg-[rgb(var(--muted))]" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-full animate-pulse rounded bg-[rgb(var(--muted))]" />
                  <div className="h-5 w-2/3 animate-pulse rounded bg-[rgb(var(--muted))]" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-full animate-pulse rounded bg-[rgb(var(--muted))]" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-[rgb(var(--muted))]" />
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <div className="h-5 w-14 animate-pulse rounded-full bg-[rgb(var(--muted))]" />
                    <div className="h-5 w-14 animate-pulse rounded-full bg-[rgb(var(--muted))]" />
                    <div className="h-5 w-10 animate-pulse rounded-full bg-[rgb(var(--muted))]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
