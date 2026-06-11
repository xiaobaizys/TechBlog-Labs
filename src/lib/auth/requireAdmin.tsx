import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { ReactNode } from "react";

/**
 * 高阶组件：要求用户是管理员，否则重定向到首页
 *
 * 用法 1 — 包裹页面内容：
 * ```tsx
 * export default async function AdminPage() {
 *   return requireAdmin(<AdminPanel />);
 * }
 * ```
 *
 * 用法 2 — 最简方式：
 * ```tsx
 * export default async function AdminPage() {
 *   await requireAdmin();
 *   return <AdminPanel />;
 * }
 * ```
 */

export async function requireAdmin(): Promise<void>;
export async function requireAdmin(content: ReactNode): Promise<ReactNode>;
export async function requireAdmin(
  content?: ReactNode
): Promise<ReactNode | void> {
  const session = await auth();

  // 未登录
  if (!session?.user) {
    redirect("/login");
  }

  // 非管理员
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  if (content) {
    return content;
  }
}
