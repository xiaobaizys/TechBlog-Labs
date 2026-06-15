"use client";

import { usePathname } from "next/navigation";

/**
 * 判断当前路径是否需要隐藏 AI 聊天悬浮按钮
 *
 * 隐藏规则:
 *  - /login   → 登录页
 *  - /register → 注册页
 *  - /admin*  → 后台管理所有页面
 *  - /forgot-password → 忘记密码页
 *  - /api/*   → API 路由（理论上不会渲染，以防万一）
 *
 * @returns true 表示应该隐藏 AI 助手
 */
export function useHideAIChat(): boolean {
  const pathname = usePathname();
  if (!pathname) return false;

  // 认证相关页面
  if (pathname.startsWith("/login")) return true;
  if (pathname.startsWith("/register")) return true;
  if (pathname.startsWith("/forgot-password")) return true;

  // 后台管理
  if (pathname.startsWith("/admin")) return true;

  // API 路由（兜底）
  if (pathname.startsWith("/api")) return true;

  return false;
}
