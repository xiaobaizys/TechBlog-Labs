import { Suspense } from "react";
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
 * ============================================================ */

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm theme-card p-8 text-center text-sm text-[rgb(var(--muted-foreground))]">
            正在加载注册表单...
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
