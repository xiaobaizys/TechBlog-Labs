import Link from "next/link";
import { BarChart3, ExternalLink } from "lucide-react";
import { BackButton } from "@/components/admin/BackButton";

/**
 * /admin 统一布局（公开页面）
 *
 *  - 所有人均可访问，无需登录
 *  - 顶部 StatsTopBar：
 *      左：品牌（站点统计）— 点击回 /admin
 *      右：返回上一页 + 跳前台（新标签打开 /）
 *  - 主体区域：max-w-6xl + 内边距，子页面不用再关心外壳
 */
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[rgb(var(--background))]">
      <StatsTopBar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

/* ============================================================
 *  StatsTopBar · 统计页面顶栏
 *  - 粘性顶部，z-30
 *  - 半透明背景 + backdrop-blur，与前台 TopHeader 视觉统一
 *  - 移动端自适应（按钮不换行）
 * ============================================================ */
function StatsTopBar() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]/80 backdrop-blur supports-[backdrop-filter]:bg-[rgb(var(--background))]/60"
      role="banner"
    >
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* 左：品牌（点击回 /admin） */}
        <Link
          href="/admin"
          className="group flex items-center gap-2 text-sm font-medium text-[rgb(var(--muted-foreground))] transition-colors hover:text-amber-bright"
          aria-label="返回站点统计首页"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-amber-bright group-hover:border-amber-bright/60">
            <BarChart3 className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-[15px] font-semibold text-[rgb(var(--foreground))] group-hover:text-amber-bright transition-colors">
              站点统计
            </span>
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.25em] text-[rgb(var(--muted-foreground))] sm:inline">
              Site Stats
            </span>
          </span>
        </Link>

        {/* 右：返回上一页 + 返回后台 + 跳前台 */}
        <div className="flex items-center gap-2">
          <BackButton />
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--muted-foreground))] transition-all hover:border-amber hover:bg-amber/10 hover:text-amber-bright sm:px-3 sm:text-sm"
            title="返回管理后台首页"
          >
            <span className="hidden sm:inline">返回后台</span>
            <span className="sm:hidden">后台</span>
          </Link>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--muted-foreground))] transition-all hover:border-amber hover:bg-amber/10 hover:text-amber-bright sm:px-3 sm:text-sm"
            title="新标签页打开站点首页"
          >
            <span className="hidden sm:inline">返回首页</span>
            <span className="sm:hidden">首页</span>
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} />
          </a>
        </div>
      </div>
    </header>
  );
}
