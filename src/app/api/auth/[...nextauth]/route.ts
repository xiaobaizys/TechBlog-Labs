import { handlers } from "@/lib/auth";

/**
 * NextAuth API 路由处理器
 *
 * 处理所有 /api/auth/* 请求：
 * - GET  /api/auth/signin     → 登录页面
 * - POST /api/auth/signin     → 提交登录
 * - POST /api/auth/signout    → 退出登录
 * - GET  /api/auth/session    → 获取当前 session
 * - GET  /api/auth/csrf       → CSRF token
 * - GET  /api/auth/callback/* → OAuth 回调
 *
 * 限流已移入 authorize() 内部（auth.config.ts），避免破坏 NextAuth 响应协议。
 * 外层包装会导致 429 JSON 与 NextAuth client 不兼容 → Invalid URL / 不可控错误。
 */
export const { GET, POST } = handlers;
