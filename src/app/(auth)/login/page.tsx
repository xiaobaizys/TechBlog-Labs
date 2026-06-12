import { Suspense } from "react";
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
 *  - 极简布局：只放登录表单
 *  - 使用 Suspense 包裹 LoginForm（内部用了 useSearchParams / useRouter）
 */
export default function LoginPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center px-4 py-12 md:py-20">
      {/* 背景装饰：与 Stargazer 主题呼应 */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-amber/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-amber-bright/10 blur-3xl" />
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
  );
}
