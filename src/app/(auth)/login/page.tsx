import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";

/**
 * 登录页 SEO：禁止搜索引擎索引
 */
export const metadata = {
  title: "登录",
  robots: { index: false, follow: true },
};

/**
 * 登录页面
 *
 *  - 左右分栏布局：左侧配图，右侧表单（移动端纵向堆叠）
 *  - 使用 Suspense 包裹 LoginForm（内部用了 useSearchParams / useRouter）
 */
export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-stretch">
      {/* 左侧配图区 — 仅桌面端可见 */}
      <div className="hidden md:block relative w-1/2 min-h-screen bg-muted overflow-hidden">
        <Image
          src="/image/background (3).jpg"
          alt="登录"
          fill
          className="object-cover"
          sizes="50vw"
          priority
        />
        {/* 图片暗化蒙版 */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 to-background/60" />
        {/* 左侧文字叠加 */}
        <div className="absolute inset-0 flex flex-col justify-center px-16 z-10">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-bright/80 mb-6">
            Welcome back
          </p>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-white mb-4">
            回到 VitaLog
          </h2>
          <p className="text-white/70 text-sm max-w-xs leading-relaxed">
            记录你的技术与生活，把每天的一点点灵感，留在这里。
          </p>
        </div>
      </div>

      {/* 右侧：表单 + 背景光斑 */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-12 md:py-20 bg-background">
        {/* 背景光斑装饰 */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-amber/8 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-amber-bright/8 blur-3xl" />
        </div>

        <div className="mx-auto w-full max-w-md">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgb(var(--border))] border-t-amber" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
