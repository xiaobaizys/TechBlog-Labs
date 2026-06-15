/**
 * Service Worker 注册与生命周期管理
 *
 * 仅在 production 环境注册。
 * 开发环境 (`NODE_ENV !== "production"`) 跳过，
 * 同时可以通过 `?sw=1` URL 参数强制启用（调试用）。
 */

let registration: ServiceWorkerRegistration | null = null;

/** 当前 SW 是否激活 */
export function isSWActive(): boolean {
  return registration !== null;
}

/** 注册 Service Worker */
export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  // 无浏览器环境
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;

  // 开发环境：默认不注册（可通过 ?sw=1 强制启用）
  const params = new URLSearchParams(window.location.search);
  const forceSW = params.get("sw") === "1";
  if (process.env.NODE_ENV !== "production" && !forceSW) {
    console.info("[SW] 开发环境 — 跳过 SW 注册。添加 ?sw=1 强制启用。");
    return null;
  }

  try {
    // 先清理旧 SW（如果有且属于不同版本）
    const oldRegs = await navigator.serviceWorker.getRegistrations();
    for (const r of oldRegs) {
      // 如果旧 SW 不是当前 scope，注销
      if (r.scope !== `${window.location.origin}/`) {
        await r.unregister();
      }
    }

    registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.info("[SW] 已注册:", registration.scope);

    // 监听更新
    registration.addEventListener("updatefound", () => {
      const installing = registration!.installing;
      if (installing) {
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            console.info("[SW] 新版本可用 — 刷新页面以激活");
          }
        });
      }
    });

    // 处理 SW 更新
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return registration;
  } catch (e) {
    console.warn("[SW] 注册失败:", e);
    return null;
  }
}

/** 主动检查更新 */
export async function checkSWUpdate(): Promise<boolean> {
  if (!registration) return false;
  try {
    await registration.update();
    return true;
  } catch {
    return false;
  }
}

/** 注销 SW（调试用） */
export async function unregisterSW(): Promise<boolean> {
  if (!registration) return false;
  try {
    await registration.unregister();
    registration = null;
    return true;
  } catch {
    return false;
  }
}
