import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, ShieldCheck, Mail, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "./profile-edit-form";
import { UserAvatar } from "@/components/user/UserAvatar";

/**
 * /profile/edit · 个人资料编辑
 *
 * 服务端组件：
 *  - 未登录 → 跳 /login
 *  - 拉取当前用户最新数据
 *  - 渲染 ProfileEditForm（客户端组件）
 */
export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fprofile%2Fedit");
  }

  const userId = session.user.id;
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
    },
  });

  // 防止 DB 抖动时表单显示"空" — 至少给一个名字
  const name = dbUser?.name ?? session.user.name ?? "";
  const email = dbUser?.email ?? session.user.email ?? null;
  const image = dbUser?.image ?? session.user.image ?? null;
  const role = dbUser?.role ?? ((session.user.role as string) ?? "USER");
  const emailVerified = dbUser?.emailVerified ?? null;
  const createdAt = dbUser?.createdAt ?? null;

  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      {/* 顶部：返回 + 标题 */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/profile"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))] transition-all hover:border-amber hover:text-amber-bright"
          aria-label="返回个人中心"
          title="返回个人中心"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-amber-bright/80 font-mono">
            — Edit Profile
          </p>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">
            编辑个人资料
          </h1>
        </div>
      </div>

      {/* 头像预览条（不可在此处改；改头像回 /profile 即可） */}
      <section className="theme-card mb-6 flex items-center gap-4 p-5">
        <UserAvatar
          name={name}
          image={image}
          userId={userId}
          size="lg"
          ring
        />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base font-semibold truncate">
            {name || "未设置昵称"}
          </p>
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            如需更换头像，请前往{" "}
            <Link
              href="/profile"
              className="text-amber-bright hover:underline"
            >
              个人中心
            </Link>{" "}
            点击头像
          </p>
        </div>
        {role === "ADMIN" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber/40 bg-amber/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-bright">
            <ShieldCheck className="h-3 w-3" /> Admin
          </span>
        )}
      </section>

      {/* 编辑表单 */}
      <section className="theme-card p-6 sm:p-8">
        <h2 className="mb-1 inline-flex items-center gap-2 font-serif text-lg font-semibold">
          <User className="h-4 w-4 text-amber-bright" />
          基本信息
        </h2>
        <p className="mb-6 text-sm text-[rgb(var(--muted-foreground))]">
          昵称会显示在评论、文章作者等位置。邮箱用于通知和找回账号。
        </p>

        <ProfileEditForm
          userId={userId}
          initialName={name}
          initialEmail={email ?? ""}
        />
      </section>

      {/* 只读：账号信息 */}
      <section className="theme-card mt-6 p-6 sm:p-8">
        <h2 className="mb-4 inline-flex items-center gap-2 font-serif text-lg font-semibold">
          <Lock className="h-4 w-4 text-amber-bright" />
          账号信息
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Row label="用户 ID">
            <code className="break-all text-xs text-[rgb(var(--muted-foreground))]">
              {userId}
            </code>
          </Row>
          <Row label="角色">{role}</Row>
          <Row label="注册时间">{memberSince}</Row>
          <Row
            label="邮箱验证"
            icon={
              <Mail
                className={`h-3.5 w-3.5 ${
                  emailVerified ? "text-emerald-500" : "text-amber-bright"
                }`}
              />
            }
          >
            {emailVerified ? (
              <span className="text-emerald-600 dark:text-emerald-400">✓ 已验证</span>
            ) : email ? (
              <span className="text-amber-bright">未验证（修改邮箱后需重新验证）</span>
            ) : (
              <span className="text-[rgb(var(--muted-foreground))]">未设置邮箱</span>
            )}
          </Row>
        </dl>
      </section>
    </div>
  );
}

function Row({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2">
      <dt className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
        {icon}
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
