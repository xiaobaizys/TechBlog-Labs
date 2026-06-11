import { handlers } from "@/lib/auth";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

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
 * POST 加限流防登录爆破（5 req/min per IP）
 */
const basePOST = handlers.POST;
export const POST = withRateLimit(RATE_LIMITS.auth, (req) => basePOST(req));
export const { GET } = handlers;
