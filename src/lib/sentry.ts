/**
 * Sentry 错误监控配置
 *
 * 使用方法:
 * 1. 在 https://sentry.io 创建项目
 * 2. 获取 DSN (Data Source Name)
 * 3. 添加环境变量: SENTRY_DSN=https://xxx@sentry.io/xxx
 * 4. (可选) 添加 SENTRY_AUTH_TOKEN 用于源码映射上传
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    console.log("⚠️  SENTRY_DSN 未配置，错误监控已禁用");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === "development",
    integrations: [
      // 自动捕获未处理的 Promise rejection
      Sentry.browserTracingIntegration(),
    ],
    beforeSend(event) {
      // 在开发环境下不发送事件
      if (process.env.NODE_ENV === "development") {
        console.log("Sentry event (dev mode):", event);
        return null;
      }
      return event;
    },
  });

  console.log("✅ Sentry 错误监控已初始化");
}

/**
 * 手动报告错误
 */
export function reportError(error: Error, context?: Record<string, any>) {
  if (!SENTRY_DSN) return;

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * 设置用户信息（用于错误追踪）
 */
export function setSentryUser(user: { id: string; email?: string; username?: string }) {
  if (!SENTRY_DSN) return;

  Sentry.setUser(user);
}

/**
 * 添加面包屑（记录用户操作路径）
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: Sentry.SeverityLevel = "info"
) {
  if (!SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    category,
    message,
    level,
    timestamp: Date.now(),
  });
}
