import { Suspense } from "react";
import Image from "next/image";
import RegisterForm from "./RegisterForm";

/* ============================================================
 *  注册页 · 服务端壳
 * ------------------------------------------------------------
 *  RegisterForm 内部使用了 useSearchParams()，
 *  必须用 <Suspense> 包裹，否则构建时会触发 CSR bailout 报错
 *  （https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout）
 *
 *  通过把表单拆出来 + Suspense 包裹，外层壳仍可静态预渲染，
 *  只有真正需要 searchParams 的子树推迟到客户端渲染。
 *
 *  布局：左右分栏 — 左侧配图 + 右侧表单（移动端纵向堆叠）
 * ============================================================ */

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen items-stretch">
      {/* 左侧配图区 — 仅桌面端可见 */}
      <div className="hidden md:block relative w-1/2 min-h-screen bg-muted overflow-hidden">
        <Image
          src="/image/background (2).jpg"
          alt="注册"
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
            Get started
          </p>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-white mb-4">
            加入 VitaLog
          </h2>
          <p className="text-white/70 text-sm max-w-xs leading-relaxed">
            创建账号即代表你同意我们的服务条款和隐私政策。
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

        <Suspense
          fallback={
            <div className="w-full max-w-sm theme-card p-8 text-center text-sm text-[rgb(var(--muted-foreground))]">
              正在加载注册表单...
            </div>
          }
        >
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
