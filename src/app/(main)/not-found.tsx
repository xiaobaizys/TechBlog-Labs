import Link from "next/link";
import { Home, Compass, Search } from "lucide-react";

/**
 * 主站 404 兜底页
 *
 *  - 放在 (main) 路由组：覆盖 /, /blog/*, /projects/*, /life/*, /tags/*, /about ...
 *  - App Router 会自动在未匹配路由处渲染
 *  - 设计语言：复用主题色（amber-bright）+ 衬线大字 + 卡片式 CTA
 *  - 故意不放任何客户端逻辑：保持服务端组件 / 不影响首屏
 */
export default function NotFound() {
  return (
    <main className="vitalog-home flex min-h-[calc(100vh-12rem)] items-center justify-center px-5 py-20">
      <div className="theme-card relative w-full max-w-xl overflow-hidden p-10 text-center sm:p-14">
        {/* 装饰大数字 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 select-none font-serif text-[10rem] font-bold leading-none text-amber-bright/10 sm:text-[14rem]"
        >
          404
        </div>

        <div className="relative">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.25em] text-[rgb(var(--muted-foreground))]">
            <Compass className="h-3 w-3" strokeWidth={2.2} />
            Page Not Found
          </p>

          <h1 className="font-serif text-4xl font-semibold tracking-tight text-[rgb(var(--foreground))] sm:text-5xl">
            走丢了一页
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[rgb(var(--muted-foreground))] sm:text-base">
            你要找的页面可能已迁移、删除，或者链接拼写有误。
            <br className="hidden sm:block" />
            回到首页继续探索，或试试下面的入口。
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-amber-bright hover:shadow-md sm:w-auto"
            >
              <Home className="h-4 w-4" strokeWidth={2.2} />
              回到首页
            </Link>
            <Link
              href="/blog"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-2.5 text-sm font-medium text-[rgb(var(--muted-foreground))] transition-all hover:border-amber-bright/50 hover:text-amber-bright sm:w-auto"
            >
              <Search className="h-4 w-4" strokeWidth={2.2} />
              翻翻博客
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
