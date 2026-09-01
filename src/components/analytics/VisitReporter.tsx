"use client";

import { useEffect } from "react";

/**
 * VisitReporter · 访客统计上报器
 *
 * 工作原理：
 *  1) middleware 在每个页面响应中通过 Cookie 注入 visitorId / page / referer
 *  2) 本组件在浏览器端直接读取 Cookie，无需额外的 fetch 探测
 *  3) 用 navigator.sendBeacon 上报 /api/visit，页面切换/刷新也不会被 abort
 *
 * 为什么不直接在 middleware 里写库？
 *  - Edge Runtime 无法连接 PostgreSQL（Prisma 暂不支持 Edge）
 *  - 必须由 Node Runtime 的 API Route 处理
 *
 * 去重：
 *  - 同一 URL 在同一 session 内只上报一次（sessionStorage 标记）
 *  - 避免开发时 HMR 反复触发
 */

const REPORTED_KEY = "vitalog:visit:reported";
const COOKIE_NAME = "__vitalog_visit";
const DEDUPE_MS = 5 * 60 * 1000;

type ReportedMap = Record<string, number>; // page -> timestamp

type VisitPayload = {
  visitorId: string;
  page: string;
  referer?: string;
};

function loadReported(): ReportedMap {
  try {
    const raw = sessionStorage.getItem(REPORTED_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ReportedMap;
  } catch {
    return {};
  }
}

function saveReported(map: ReportedMap) {
  try {
    sessionStorage.setItem(REPORTED_KEY, JSON.stringify(map));
  } catch {
    /* sessionStorage 满或禁用，忽略 */
  }
}

function getVisitCookie(): VisitPayload | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    let value = decodeURIComponent(match[1]);
    // 兼容双重编码（旧版本 middleware 可能手动 encodeURIComponent）
    if (value.startsWith('%')) {
      try { value = decodeURIComponent(value); } catch { /* ignore */ }
    }
    return JSON.parse(value) as VisitPayload;
  } catch {
    return null;
  }
}

function clearVisitCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; sameSite=lax`;
}

export function VisitReporter() {
  useEffect(() => {
    // 仅在浏览器执行
    if (typeof window === "undefined") return;

    // 跳过预取 / SEO 预渲染
    if (window.navigator.userAgent.toLowerCase().includes("bot")) return;

    const page = window.location.pathname;
    if (!page) return;

    // ---------- 去重：同一 session + 同一 page 5 分钟内只上报一次 ----------
    const now = Date.now();
    const reported = loadReported();
    const lastTime = reported[page] ?? 0;
    if (now - lastTime < DEDUPE_MS) return;

    // ---------- 浏览器空闲时上报 ----------
    const report = () => {
      const payload = getVisitCookie();
      if (!payload?.visitorId || !payload?.page) {
        // middleware 未注入（可能是 /api/ 或被跳过），不上报
        return;
      }

      const body = JSON.stringify({
        visitorId: payload.visitorId,
        page: payload.page,
        referer: payload.referer || document.referrer || "",
        userAgent: window.navigator.userAgent,
        sessionId: sessionStorage.getItem("vitalog:sid") || undefined,
      });

      // 优先使用 sendBeacon：页面卸载时不会被 cancel，也不会产生 ERR_ABORTED
      const beaconSent =
        typeof navigator.sendBeacon === "function" &&
        navigator.sendBeacon("/api/visit", new Blob([body], { type: "application/json" }));

      if (!beaconSent) {
        // sendBeacon 不可用时回退到 fetch（keepalive 尽量保证页面关闭前送达）
        fetch("/api/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {
          // 网络抖动，下次再试
        });
      }

      // 标记已上报并清除 cookie，避免重复上报
      reported[page] = Date.now();
      saveReported(reported);
      clearVisitCookie();
    };

    type RIC = typeof requestIdleCallback;
    const ric = (window as unknown as { requestIdleCallback?: RIC })
      .requestIdleCallback;
    if (typeof ric === "function") {
      ric(() => report(), { timeout: 3000 });
    } else {
      setTimeout(() => report(), 1500);
    }
  }, []);

  return null;
}
