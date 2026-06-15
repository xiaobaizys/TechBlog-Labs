/**
 * useCache — React Hook，优先读 IndexedDB 缓存，后台静默刷新
 *
 * 使用模式（类似 SWR）：
 *   const { data, error, loading } = useCache("/api/posts?page=1", fetcher);
 *
 * 流程：
 *   1. render 时优先返回缓存数据（loading = false）
 *   2. 后台发起 fetch，更新缓存 + 触发 rerender
 *   3. fetch 失败时继续展示缓存（离线友好）
 *
 * 注意：
 *   - 不做去重/全局缓存（每个组件实例独立），保持简单
 *   - 需要全局共享的话，用 Context 或状态库包裹
 */

"use client";

import { useRef, useReducer, useEffect } from "react";
import { getCache, setCache } from "./indexedDB";

// ============================================================
// 类型
// ============================================================

type CacheState<T> = {
  data: T | null;
  error: Error | null;
  loading: boolean;
  /** 是否正在后台刷新 */
  revalidating: boolean;
};

type Action<T> =
  | { type: "LOADING" }
  | { type: "SET_DATA"; data: T; fromCache: boolean }
  | { type: "SET_ERROR"; error: Error }
  | { type: "REVALIDATING" };

// ============================================================
// 配置
// ============================================================

type UseCacheOptions = {
  /** 缓存 TTL（毫秒），默认 5 分钟 */
  ttlMs?: number;
  /** 是否启用缓存，默认 true */
  enabled?: boolean;
  /** 依赖数组，变化时重新拉取 */
  deps?: unknown[];
};

// ============================================================
// Hook
// ============================================================

/**
 * 优先读缓存的 fetch hook
 *
 * @param key   唯一缓存键（如 API URL）
 * @param fetcher  网络数据获取函数
 * @param options  配置
 *
 * @example
 *   const { data } = useCache("/api/posts?page=1", () =>
 *     fetch("/api/posts?page=1").then(r => r.json())
 *   );
 */
export function useCache<T>(
  key: string | (() => string),
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
): CacheState<T> & { refresh: () => Promise<void> } {
  const { ttlMs = 5 * 60 * 1000, enabled = true, deps = [] } = options;

  const cacheKey = typeof key === "function" ? key() : key;

  const [state, dispatch] = useReducer(
    (s: CacheState<T>, a: Action<T>): CacheState<T> => {
      switch (a.type) {
        case "LOADING":
          return { ...s, loading: s.data === null, error: null };
        case "SET_DATA":
          return { data: a.data, error: null, loading: false, revalidating: false };
        case "SET_ERROR":
          return { ...s, error: a.error, loading: false, revalidating: false };
        case "REVALIDATING":
          return { ...s, revalidating: true };
        default:
          return s;
      }
    },
    { data: null, error: null, loading: true, revalidating: false }
  );

  // refs 用于避免重复请求
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const depsKey = JSON.stringify(deps);

  // 标记组件卸载
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const doFetch = async () => {
    if (!enabled || inFlight.current) return;
    inFlight.current = true;

    // 先从缓存读
    try {
      const cached = await getCache<T>(cacheKey);
      if (cached && mounted.current) {
        dispatch({ type: "SET_DATA", data: cached, fromCache: true });
        dispatch({ type: "REVALIDATING" });
      } else if (mounted.current) {
        dispatch({ type: "LOADING" });
      }
    } catch {
      if (mounted.current) dispatch({ type: "LOADING" });
    }

    // 网络获取
    try {
      const data = await fetcher();
      if (!mounted.current) return;
      dispatch({ type: "SET_DATA", data, fromCache: false });
      // 写缓存（不阻塞）
      setCache(cacheKey, data, ttlMs).catch(() => {});
    } catch (e) {
      if (!mounted.current) return;
      const err = e instanceof Error ? e : new Error(String(e));
      dispatch({ type: "SET_ERROR", error: err });
    } finally {
      inFlight.current = false;
    }
  };

  // 当 key 或 deps 变化时重新拉取
  useEffect(() => {
    doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, depsKey, enabled]);

  return {
    ...state,
    refresh: doFetch,
  };
}
