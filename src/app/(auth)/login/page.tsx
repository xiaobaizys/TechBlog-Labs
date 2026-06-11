import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { AboutPanel } from "@/components/shared/AboutPanel";

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
 *  - 桌面端：左 登录表单 / 右 About 面板
 *  - 移动端：单列堆叠（表单在上，About 在下）
 *
 * 使用 Suspense 包裹 LoginForm，因为其中使用了 useSearchParams()
 */
export default function LoginPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] px-4 py-12 md:py-20">
      {/* 背景装饰：与 Stargazer 主题呼应 */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-amber/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-amber-bright/10 blur-3xl" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ============================================================
           左：登录表单
           ============================================================ */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgb(var(--border))] border-t-amber" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* ============================================================
           右：About 面板（从首页迁入）
           ============================================================ */}
        <aside className="lg:sticky lg:top-20">
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 md:p-8 shadow-sm">
            <AboutPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}
