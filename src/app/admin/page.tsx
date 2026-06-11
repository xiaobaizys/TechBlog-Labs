import { requireAdmin } from "@/lib/auth/requireAdmin";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

/**
 * /admin · 管理后台首页
 *
 *  - requireAdmin() 守卫：未登录跳 /login，非 ADMIN 跳 /
 *  - 顶部 4 个数据卡：博客 / 评论 / 用户 / 浏览量（直接查 DB 避免循环 fetch）
 *  - 6 张快捷入口卡：仪表盘 / 文章 / 项目 / 评论 / 用户 / 配置
 *  - 底部"系统信息"块：当前时间、角色、数据库连接状态
 *
 *  与 /admin/dashboard 的区别：
 *  - /admin/dashboard：纯数据可视化（图表 + 趋势）
 *  - /admin（本页）：导航 + 概览，作为所有 admin 子路由的总入口
 */
export const dynamic = "force-dynamic";

/**
 * 管理后台 SEO：禁止索引
 */
export const metadata = {
  title: "管理后台",
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
  await requireAdmin();
  const stats = await getStats();
  const now = new Date().toLocaleString("zh-CN", { hour12: false });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      {/* 头部 */}
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-bright/80 font-mono mb-2">
            — Admin Console
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            管理后台
          </h1>
          <p className="mt-1.5 text-sm text-[rgb(var(--muted-foreground))]">
            欢迎回来。所有数据均为实时统计。
          </p>
        </div>
        <div className="text-xs text-[rgb(var(--muted-foreground))] sm:text-right">
          <div>{now}</div>
          <div className="mt-0.5">已登录 · 管理员权限</div>
        </div>
      </header>

      {/* 4 个数据卡 */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="博客文章" value={stats.totalPosts} accent="amber" href="/admin/posts" />
        <StatTile
          label="评论"
          value={stats.totalComments}
          accent="sky"
          href="/admin/comments"
          badge={stats.pendingComments > 0 ? `${stats.pendingComments} 待审` : undefined}
        />
        <StatTile label="注册用户" value={stats.totalUsers} accent="emerald" href="/admin/users" />
        <StatTile label="总浏览量" value={stats.totalViews} accent="violet" href="/admin/dashboard" />
      </section>

      {/* 6 个快捷入口 */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
          快捷入口
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminLink
            href="/admin/dashboard"
            title="仪表盘"
            desc="近 7 日文章 / 评论趋势 + 热门文章 Top 5"
            icon="📊"
          />
          <AdminLink
            href="/admin/posts"
            title="文章管理"
            desc="发布、编辑、删除博客文章"
            icon="📝"
            badge={stats.drafts > 0 ? `${stats.drafts} 草稿` : undefined}
          />
          <AdminLink
            href="/admin/projects"
            title="项目管理"
            desc="维护项目作品集、Tech Stack、演示链接"
            icon="🚀"
          />
          <AdminLink
            href="/admin/comments"
            title="评论管理"
            desc="审核、批准、删除用户评论"
            icon="💬"
            badge={stats.pendingComments > 0 ? `${stats.pendingComments} 待审` : undefined}
          />
          <AdminLink
            href="/admin/users"
            title="用户管理"
            desc="查看用户列表、调整角色、封禁账号"
            icon="👥"
          />
          <AdminLink
            href="/admin/config"
            title="站点配置"
            desc="网站标题、描述、社交链接、SEO 等"
            icon="⚙️"
          />
        </div>
      </section>

      {/* 系统信息 */}
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
