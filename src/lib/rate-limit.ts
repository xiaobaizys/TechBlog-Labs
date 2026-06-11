import { NextRequest, NextResponse } from "next/server";
import { redis } from "./redis";

/**
 * 简易固定窗口限流（基于 Redis INCR + EXPIRE）
 *
 *  - key 形如 `rl:{namespace}:{ip-or-userId}:{windowStart}`
 *  - 每次请求 INCR，第一次 INCR 后 EXPIRE 60s
 *  - 失败时 fail-open（Redis 不可用就放行，避免雪崩）
 *
 *  - 比 sliding window 简单 ~30 行代码，个人博客足够
 *  - 边界问题：窗口切换瞬时可能放过 2x 流量，可接受
 */

export type RateLimitConfig = {
  /** 命名空间（用于分组 + 监控） */
  namespace: string;
  /** 窗口内允许的最大请求数 */
  limit: number;
  /** 窗口长度（秒） */
  windowSec: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetSec: number;
};

/**
 * 限流核心逻辑
 * @returns 限流结果（无论 allowed 与否都返回，调用方决定行为）
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { namespace, limit, windowSec } = config;
  const r = redis();
  if (!r) {
    // Redis 不可用：放行
    return { allowed: true, remaining: limit, limit, resetSec: 0 };
  }

  // 窗口起点（对齐到 windowSec 倍数）
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSec) * windowSec;
  const key = `rl:${namespace}:${identifier}:${windowStart}`;

  try {
    const pipeline = r.multi();
    pipeline.incr(key);
    pipeline.expire(key, windowSec, "NX"); // 仅首次设置过期时间
    const results = (await pipeline.exec()) as [Error | null, number][] | null;

    if (!results) {
      return { allowed: true, remaining: limit, limit, resetSec: 0 };
    }
    const count = results[0]?.[1] ?? 0;
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetSec = windowStart + windowSec - now;

    return { allowed, remaining, limit, resetSec };
  } catch {
    // Redis 错误：放行
    return { allowed: true, remaining: limit, limit, resetSec: 0 };
  }
}

/**
 * 从请求中提取限流标识
 *  - 登录用户用 userId
 *  - 匿名用 IP（X-Forwarded-For / X-Real-IP 优先，回退到 remoteAddr）
 */
export function getClientIdentifier(
  request: NextRequest,
  userId?: string
): string {
  if (userId) return `u:${userId}`;
  const xff = request.headers.get("x-forwarded-for");
  const xri = request.headers.get("x-real-ip");
  const ip = xff?.split(",")[0]?.trim() || xri || "unknown";
  return `ip:${ip}`;
}

/**
 * 包装一个 API handler：自动限流
 *
 * @example
 *   export const POST = withRateLimit({ namespace: "login", limit: 5, windowSec: 60 }, async (req) => {
 *     // ...
 *   });
 */
export function withRateLimit<T extends (req: NextRequest, ctx?: any) => Promise<Response>>(
  config: RateLimitConfig & {
    /** 自定义 identifier 函数（默认 IP） */
    getIdentifier?: (req: NextRequest) => Promise<string | undefined> | string | undefined;
  },
  handler: T
): T {
  return (async (req: NextRequest, ctx?: any) => {
    const userId = await config.getIdentifier?.(req);
    const identifier = getClientIdentifier(req, userId);
    const result = await checkRateLimit(identifier, {
      namespace: config.namespace,
      limit: config.limit,
      windowSec: config.windowSec,
    });

    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: `请求过于频繁，请 ${result.resetSec} 秒后再试`,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetSec),
            "Retry-After": String(result.resetSec),
          },
        }
      );
    }

    const res = await handler(req, ctx);
    // 给响应也加上限流头，方便前端调试
    //
    // ⚠️ 关键修复：NextAuth 的某些响应（如 credentials 回调带 redirect: true 时）
    //   会返回 immutable headers 的 Response 对象，对它直接 .set() 会抛
    //   `TypeError: immutable`，整个登录就会 500。
    // 这里用 try/catch 兜底，set 失败就降级为新 Headers 复制后重建 Response。
    try {
      res.headers.set("X-RateLimit-Limit", String(result.limit));
      res.headers.set("X-RateLimit-Remaining", String(result.remaining));
      return res;
    } catch {
      // headers 是 immutable，需要克隆 headers 再重建 Response
      const newHeaders = new Headers(res.headers);
      newHeaders.set("X-RateLimit-Limit", String(result.limit));
      newHeaders.set("X-RateLimit-Remaining", String(result.remaining));
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: newHeaders,
      });
    }
  }) as T;
}

// ============================================================
// 预设的限流策略（个人博客经验值）
// ============================================================

export const RATE_LIMITS = {
  /** 登录/注册 - 严格防爆破 */
  auth: { namespace: "auth", limit: 5, windowSec: 60 },
  /** AI 调用 - 防滥用 + 省钱 */
  ai: { namespace: "ai", limit: 10, windowSec: 60 },
  /** AI 流式（chat）更宽松 */
  aiStream: { namespace: "ai-stream", limit: 20, windowSec: 60 },
  /** 评论/发帖 - 防灌水 */
  write: { namespace: "write", limit: 20, windowSec: 60 },
  /** 点赞/阅读计数 - 较宽松 */
  interact: { namespace: "interact", limit: 120, windowSec: 60 },
  /** 通用 API（搜索/查询） */
  general: { namespace: "general", limit: 60, windowSec: 60 },
} as const;
