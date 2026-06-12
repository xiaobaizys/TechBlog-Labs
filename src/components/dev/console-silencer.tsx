"use client";

import { useEffect } from "react";

/**
 * Dev-only 控制台噪音拦截器
 *
 * 背景：开发环境下，Next.js 的 RSC prefetch + next-auth 的 session 轮询
 *       会在浏览器 console 抛出一批已知、无害的"取消型"错误：
 *
 *         - [error] net::ERR_ABORTED ...?_rsc=xxxx
 *           → Link hover 触发 RSC 预取，目标页 requireAdmin/requireAuth
 *             → 服务端 redirect("/login") → 客户端 fetch 被 abort
 *         - ClientFetchError: Failed to fetch (next-auth/react.js:338)
 *           → 切标签/跳转页面时，session 轮询的 in-flight fetch 被 abort
 *         - ClientFetchError: Unexpected token '<' ...is not valid JSON
 *           → session 端点返回了 HTML（防御性保留，正常情况下不会触发）
 *
 * 拦截策略：只过滤 dev 模式、且命中已知噪音模式的消息；其它真错误照常输出。
 * 生产环境不做任何 patch（由 process.env.NODE_ENV 在打包时静态剔除）。
 */

// 命中其一即视为噪音
const NOISE_PATTERNS: RegExp[] = [
  // RSC prefetch abort（任何 _rsc 预取被取消）
  /net::ERR_ABORTED[^]*\?_rsc=/,
  // 纯 ERR_ABORTED（防御：即使 URL 不带 _rsc 也是 abort）
  /^net::ERR_ABORTED\b/,
  // 兜底：包含 ERR_ABORTED 的任意 fetch 取消
  /\bERR_ABORTED\b/,
  // Next.js dev 热重载期间的 parallel-route 软导航告警（项目无 @slot）
  /No default component was found for a parallel route/,
];

/**
 * 把任意参数（string / Error / object）归一成可正则匹配的文本
 */
function toText(arg: unknown): string {
  if (arg == null) return String(arg); // null / undefined → "null" / "undefined"，避免后面 .stack 崩溃
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}\n${arg.stack ?? ""}`;
  }
  if (typeof arg === "object") {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

/**
 * 判断一条 console.error 调用是否属于已知噪音
 *
 *  - 必须包含 ERR_ABORTED
 *  - 额外收紧：next-auth 的 "Failed to fetch" 也要兜住
 *    （它的 message 不会带 ERR_ABORTED 字样，但 stack 里会）
 */
function isNoise(args: unknown[]): boolean {
  const text = args.map(toText).join("\n");

  if (NOISE_PATTERNS.some((re) => re.test(text))) return true;

  // next-auth session 轮询的 abort：Failed to fetch + 栈里出现 next-auth
  if (
    /Failed to fetch/.test(text) &&
    /next-auth/.test(text) &&
    /(visibilityHandler|fetchData)/.test(text)
  ) {
    return true;
  }

  return false;
}

export function ConsoleSilencer() {
  useEffect(() => {
    // 生产环境：完全不动 console
    if (process.env.NODE_ENV === "production") return;

    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);

    console.error = (...args: unknown[]) => {
      if (isNoise(args)) return;
      originalError(...args);
    };

    // warn 通道也偶有 ERR_ABORTED（早期 fetch 被 warn 过再 error）
    console.warn = (...args: unknown[]) => {
      if (isNoise(args)) return;
      originalWarn(...args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return null;
}
