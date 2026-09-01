import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

/**
 * /admin · 站点统计首页（公开页面）
 *
 *  - 无需登录，所有人均可访问
 *  - 顶部 4 个数据卡：博客 / 评论 / 用户 / 浏览量（直接查 DB 避免循环 fetch）
 *  - 快捷入口卡：仪表盘 / 访客地图 / 访客分析
 *  - 底部"系统信息"块
 *
 *  优化：统计区块用 Suspense 包裹做流式加载，页面骨架先渲染。
 */
export const dynamic = "force-dynamic";

/**
 * 站点统计 SEO
 */
export const metadata = {
  title: "站点统计",
  robots: { index: false, follow: false },
};

type DashStats = {
  totalPosts: number;
  totalComments: number;
  totalUsers: number;
  totalViews: number;
  pendingComments: number;
  drafts: number;
};

async function getStats(): Promise<DashStats> {
  const [totalPosts, totalComments, totalUsers, totalViews, pendingComments, drafts] =
    await Promise.all([
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.comment.count(),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.post
        .aggregate({ _sum: { viewCount: true }, where: { deletedAt: null } })
        .then((r) => r._sum.viewCount ?? 0),
      prisma.comment.count({ where: { isApproved: false } }),
      prisma.post.count({ where: { status: "DRAFT", deletedAt: null } }),
    ]);
  return { totalPosts, totalComments, totalUsers, totalViews, pendingComments, drafts };
}

export default async function AdminIndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      {/* 头部（立刻渲染，不依赖数据库） */}
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-bright/80 font-mono mb-2">
            — Site Stats
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            站点统计
          </h1>
          <p className="mt-1.5 text-sm text-[rgb(var(--muted-foreground))]">
            所有数据均为实时统计。
          </p>
        </div>
        <div className="text-xs text-[rgb(var(--muted-foreground))] sm:text-right">
          <div>{new Date().toLocaleString("zh-CN", { hour12: false })}</div>
        </div>
      </header>

      {/* 统计区块 + 快捷入口（流式加载） */}
      <Suspense fallback={<AdminSkeleton />}>
        <AdminContent />
      </Suspense>

      {/* 系统信息（立刻渲染） */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
          系统信息
        </h2>
        <div className="theme-card grid gap-2 p-5 text-sm sm:grid-cols-2">
          <Row label="Next.js 模式" value="App Router · Server Components" />
          <Row label="数据库" value="Prisma · PostgreSQL" />
          <Row label="认证" value="NextAuth v5 (Credentials + GitHub)" />
          <Row label="数据刷新" value="force-dynamic（每次请求重新查）" />
        </div>
      </section>
    </div>
  );
}

/* ============================================================
 *  AdminContent · 数据驱动的区块
 * ============================================================ */

async function AdminContent() {
  const stats = await getStats();

  return (
    <>
      {/* 4 个数据卡 */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="博客文章" value={stats.totalPosts} accent="amber" href="/admin/posts" />
        <StatTile label="评论" value={stats.totalComments} accent="sky" href="/admin/comments" />
        <StatTile label="注册用户" value={stats.totalUsers} accent="emerald" href="/admin/users" />
        <StatTile label="总浏览量" value={stats.totalViews} accent="violet" href="/admin/dashboard" />
      </section>

      {/* 内容管理 */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
          内容管理
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <AdminLink
            href="/admin/posts"
            title="文章管理"
            desc="创建、编辑、删除博客文章"
            icon="📝"
          />
          <AdminLink
            href="/admin/projects"
            title="项目管理"
            desc="管理项目展示"
            icon="🚀"
          />
          <AdminLink
            href="/admin/comments"
            title="评论管理"
            desc="审核、回复、删除评论"
            icon="💬"
          />
          <AdminLink
            href="/admin/users"
            title="用户管理"
            desc="查看和管理注册用户"
            icon="👥"
          />
          <AdminLink
            href="/admin/life"
            title="生活分享管理"
            desc="管理用户发布的生活分享"
            icon="🌿"
          />
          <AdminLink
            href="/admin/friends"
            title="友情链接管理"
            desc="管理友情链接和审核用户申请"
            icon="🔗"
          />
        </div>
      </section>

      {/* 站点设置 */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
          站点设置
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <AdminLink
            href="/admin/config"
            title="站点配置"
            desc="修改站点标题、描述等设置"
            icon="⚙️"
          />
          <AdminLink
            href="/admin/home-backgrounds"
            title="首页背景"
            desc="管理首页背景图片"
            icon="🖼️"
          />
          <AdminLink
            href="/admin/ai-keys"
            title="AI 密钥"
            desc="管理 AI 服务的 API 密钥"
            icon="🔑"
          />
        </div>
      </section>

      {/* 统计分析 */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
          统计分析
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <AdminLink
            href="/admin/dashboard"
            title="数据看板"
            desc="近 7 日文章 / 评论趋势 + 热门文章 Top 5"
            icon="📊"
          />
          <AdminLink
            href="/admin/visitor-map"
            title="访客地图"
            desc="查看访客地理分布、省份排行、热门城市"
            icon="🗺️"
          />
          <AdminLink
            href="/stats"
            title="访客分析"
            desc="时间分布、设备统计、热门页面、来源分析"
            icon="📈"
          />
        </div>
      </section>

      {/* 系统监控 */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
          系统监控
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <AdminLink
            href="/admin/monitor"
            title="系统监控"
            desc="查看服务器状态、性能指标"
            icon="📡"
          />
          <AdminLink
            href="/admin/cache"
            title="缓存管理"
            desc="查看和清理缓存"
            icon="💾"
          />
          <AdminLink
            href="/admin/alerts"
            title="告警管理"
            desc="查看和管理系统告警"
            icon="🔔"
          />
          <AdminLink
            href="/admin/ab-testing"
            title="A/B 测试"
            desc="管理页面 A/B 测试"
            icon="🧪"
          />
        </div>
      </section>
    </>
  );
}

/* ============================================================
 *  AdminSkeleton · 加载骨架
 * ============================================================ */

function AdminSkeleton() {
  return (
    <>
      {/* 数据卡骨架 */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="theme-card block p-5 animate-pulse"
          >
            <div className="h-3 w-16 bg-[rgb(var(--muted-foreground))/20 rounded" />
            <div className="mt-3 h-8 w-20 bg-[rgb(var(--muted-foreground))/20 rounded" />
          </div>
        ))}
      </section>

      {/* 快捷入口骨架 */}
      <section className="mt-8">
        <div className="mb-3 h-4 w-20 bg-[rgb(var(--muted-foreground))/20 rounded" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="theme-card flex items-start gap-4 p-5 animate-pulse"
            >
              <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[rgb(var(--muted-foreground))/20" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-[rgb(var(--muted-foreground))/20 rounded" />
                <div className="mt-2 h-3 w-40 bg-[rgb(var(--muted-foreground))/20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* ============================================================
 *  StatTile · 顶部数据卡
 * ============================================================ */
const ACCENT_CLASSES = {
  amber: "text-amber-bright",
  sky: "text-sky-400",
  emerald: "text-emerald-500",
  violet: "text-violet-400",
} as const;

function StatTile({
  label,
  value,
  accent,
  href,
  badge,
}: {
  label: string;
  value: number;
  accent: keyof typeof ACCENT_CLASSES;
  href: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="theme-card group block p-5 transition-all hover:border-amber/40 hover:shadow-amber"
      prefetch={false}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
          {label}
        </span>
        {badge && (
          <span className="rounded-full border border-amber/40 bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber-bright">
            {badge}
          </span>
        )}
      </div>
      <div
        className={`mt-2 font-serif text-3xl font-semibold tabular-nums ${ACCENT_CLASSES[accent]}`}
      >
        {value.toLocaleString("zh-CN")}
      </div>
    </Link>
  );
}

/* ============================================================
 *  AdminLink · 入口卡
 * ============================================================ */
function AdminLink({
  href,
  title,
  desc,
  icon,
  badge,
}: {
  href: string;
  title: string;
  desc: string;
  icon: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="theme-card group flex items-start gap-4 p-5 transition-all hover:border-amber/40 hover:shadow-amber"
      prefetch={false}
    >
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber/10 text-xl"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium group-hover:text-amber-bright transition-colors">
            {title}
          </h3>
          {badge && (
            <span className="rounded-full border border-amber/40 bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber-bright">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
          {desc}
        </p>
      </div>
      <svg
        className="h-4 w-4 flex-shrink-0 text-[rgb(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5 group-hover:text-amber-bright"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

/* ============================================================
 *  Row · 键值对行
 * ============================================================ */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] py-1.5 last:border-b-0 sm:border-b-0 sm:py-0">
      <span className="text-[rgb(var(--muted-foreground))]">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}