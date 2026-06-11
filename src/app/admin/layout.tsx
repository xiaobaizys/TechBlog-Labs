import Link from "next/link";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { ExternalLink, Settings } from "lucide-react";

/**
 * /admin 统一布局
 *
 *  - requireAdmin() 在 layout 入口守卫一次，子页面就不必各自再 guard
 *  - 顶部 AdminTopBar：
 *      左：品牌（Admin Console）— 点击回 /admin
 *      右：返回首页（外部链接图标）— 新标签页打开 /，方便对照预览
 *  - 主体区域：max-w-6xl + 内边距，子页面不用再关心外壳
 *
 *  之所以要新开标签：
 *  - 管理员常常需要「改一改 → 看一眼前台」反复切换
 *  - 同 tab 跳转会被新版 RSC 取代，丢失编辑中的状态
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen flex flex-col bg-[rgb(var(--background))]">
      <AdminTopBar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

/* ============================================================
 *  AdminTopBar · 管理后台顶栏
 *  - 粘性顶部，z-30
 *  - 半透明背景 + backdrop-blur，与前台 TopHeader 视觉统一
 *  - 移动端自适应（按钮不换行）
 * ============================================================ */
function AdminTopBar() {
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
          aria-label="返回管理后台首页"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-amber-bright group-hover:border-amber-bright/60">
            <Settings className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-serif text-[15px] font-semibold text-[rgb(var(--foreground))] group-hover:text-amber-bright transition-colors">
              管理后台
            </span>
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.25em] text-[rgb(var(--muted-foreground))] sm:inline">
              Admin Console
            </span>
          </span>
        </Link>

        {/* 右：跳前台 + 当前时间标记 */}
        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--muted-foreground))] transition-all hover:border-amber hover:bg-amber/10 hover:text-amber-bright sm:px-3 sm:text-sm"
            title="新标签页打开站点首页"
          >
            <span className="hidden sm:inline">查看前台</span>
            <span className="sm:hidden">前台</span>
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} />
          </a>
        </div>
      </div>
    </header>
  );
}
