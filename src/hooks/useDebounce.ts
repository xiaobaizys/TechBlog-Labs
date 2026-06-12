"use client";

import { useEffect, useState } from "react";

/**
 * useDebounce · 防抖一个会高频变化的值
 *  - 典型场景：搜索框 input → 延迟 300ms 再触发请求
 *  - delay=0 时退化为直接同步
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    if (delay <= 0) {
      setDebounced(value);
      return;
    }
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
