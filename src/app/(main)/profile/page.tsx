import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "./sign-out-button";
import { AvatarUploader } from "@/components/user/AvatarUploader";
import { Edit3 } from "lucide-react";

/**
 * /profile · 个人中心
 *
 * 服务端组件：
 *  - 读 session：未登录 → 重定向到 /login?callbackUrl=/profile
 *  - 拉取当前用户的统计（posts / lifePosts / comments）
 *  - 渲染用户卡片 + 统计卡 + 快捷入口
 *
 * 子路由：
 *  - /profile/life       我的生活分享
 *  - /profile/posts      我的博客（待建）
 *  - /profile/comments   我的评论（待建）
 */
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fprofile");
  }

  const userId = session.user.id;

  // 一次拉取：user 信息 + 三类计数（用 _count 取代 N+1 count）
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          lifePosts: true,
          comments: true,
        },
      },
    },
  });

  // 把 dbUser 标准化成统一的 ProfileUser 形状（解决 _count 在 fallback 中缺失）
  const user = {
    id: userId,
    name: dbUser?.name ?? session.user.name ?? null,
    email: dbUser?.email ?? session.user.email ?? null,
    image: dbUser?.image ?? session.user.image ?? null,
    role: dbUser?.role ?? ((session.user.role as string) ?? "USER"),
    emailVerified: dbUser?.emailVerified ?? null,
    createdAt: dbUser?.createdAt ?? null,
    postsCount: dbUser?._count.posts ?? 0,
    lifePostsCount: dbUser?._count.lifePosts ?? 0,
    commentsCount: dbUser?._count.comments ?? 0,
  } as const;

  const isAdmin = user.role === "ADMIN";
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      {/* 用户主卡片 */}
      <section className="theme-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* 头像（可点击上传） */}
          <div className="flex-shrink-0">
            <AvatarUploader
              name={user.name}
              image={user.image}
              userId={userId}
            />
          </div>

          {/* 用户信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-semibold tracking-tight truncate">
                {user.name ?? "未设置昵称"}
              </h1>
              {isAdmin && (
                <span className="rounded-full border border-amber/40 bg-amber/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-bright">
                  Admin
                </span>
              )}
              {user.emailVerified && (
                <span
                  className="rounded-full border border-emerald-400/40 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  title="邮箱已验证"
                >
                  ✓ 已验证
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-[rgb(var(--muted-foreground))]">
              {user.email ?? "—"}
            </p>
            <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
              加入于 {memberSince}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <Link
              href="/profile/edit"
              className="btn-shimmer inline-flex items-center gap-1.5 text-sm"
              prefetch={false}
            >
              <Edit3 className="h-3.5 w-3.5" />
              编辑资料
            </Link>
            <SignOutButton />
          </div>
        </div>
      </section>

      {/* 统计卡片 */}
      <section className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="博客" value={user.postsCount} href="/profile" />
        <StatCard
          label="生活分享"
          value={user.lifePostsCount}
          href="/profile/life"
        />
        <StatCard
          label="评论"
          value={user.commentsCount}
          href="/profile"
        />
      </section>

      {/* 快捷入口 */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <QuickLink
          href="/profile/life"
          title="我的生活分享"
          desc="查看、编辑、删除已发布的生活记录"
          icon="📔"
        />
        <QuickLink
          href="/life/new"
          title="发布新分享"
          desc="写下此刻的念想与日常"
          icon="✍️"
        />
        {isAdmin && (
          <QuickLink
            href="/admin/dashboard"
            title="管理后台"
            desc="仪表盘、内容审核、用户管理"
            icon="⚙️"
          />
        )}
        <QuickLink
          href="/about"
          title="关于本站"
          desc="了解生息日志的来龙去脉"
          icon="ℹ️"
        />
      </section>
    </div>
  );
}

/* ============================================================
 *  小型 StatCard
 * ============================================================ */
function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  const Wrapper = href === "/profile" ? "div" : Link;
  const wrapperProps =
    href === "/profile"
      ? {}
      : { href, className: "block transition-transform hover:-translate-y-0.5" };
  return (
    // @ts-expect-error - polymorphic component
    <Wrapper {...wrapperProps}>
      <div className="theme-card flex flex-col items-center justify-center px-4 py-5 text-center">
        <span className="font-serif text-3xl font-semibold tabular-nums text-amber-bright">
          {value}
        </span>
        <span className="mt-1 text-xs uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
          {label}
        </span>
      </div>
    </Wrapper>
  );
}

/* ============================================================
 *  小型 QuickLink
 * ============================================================ */
function QuickLink({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: string;
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
        <h3 className="font-medium group-hover:text-amber-bright transition-colors">
          {title}
        </h3>
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

// 防止 tree-shake 把 signOut 删掉（虽然这个文件没用到，但保留以备扩展）
export const dynamic = "force-dynamic";
