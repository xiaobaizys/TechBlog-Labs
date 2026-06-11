import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { ReactNode } from "react";

/**
 * 高阶组件：要求用户已登录，否则重定向到 /login
 *
 * 用法 1 — 直接包裹页面内容：
 * ```tsx
 * export default async function DashboardPage() {
 *   return requireAuth(<Dashboard />);
 * }
 * ```
 *
 * 用法 2 — 最简方式（不需要包裹内容）：
 * ```tsx
 * export default async function SettingsPage() {
 *   await requireAuth();
 *   return <Settings />;
 * }
 * ```
 *
 * 用法 3 — 即学即用 (Server Component)：
 * ```tsx
 * export default async function ProtectedPage() {
 *   const session = await auth();
 *   if (!session?.user) redirect("/login");
 *   return <div>Protected Content</div>;
 * }
 * ```
 */

/**
 * 检查认证状态，未登录时重定向
 * @param callbackUrl 登录后回跳的 URL，默认为当前路径
 */
export async function requireAuth(callbackUrl?: string): Promise<void>;

/**
 * 检查认证状态，未登录时重定向；已登录时渲染内容
 * @param content 受保护的内容
 * @param callbackUrl 登录后回跳的 URL
 */
export async function requireAuth(
  content: ReactNode,
  callbackUrl?: string
): Promise<ReactNode>;

export async function requireAuth(
  contentOrCallbackUrl?: ReactNode | string,
  maybeCallbackUrl?: string
): Promise<ReactNode | void> {
  const session = await auth();

  if (!session?.user) {
    let loginUrl = "/login";

    const callbackUrl =
      typeof contentOrCallbackUrl === "string"
        ? contentOrCallbackUrl
        : maybeCallbackUrl;

    if (callbackUrl) {
      loginUrl += `?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }

    redirect(loginUrl);
  }

  // 如果传入的是内容，渲染它
  if (contentOrCallbackUrl && typeof contentOrCallbackUrl !== "string") {
    return contentOrCallbackUrl;
  }
}
