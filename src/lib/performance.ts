/**
 * 性能优化工具库
 *
 * 提供常用的性能优化工具函数：
 * - 节流（Throttle）
 * - 防抖（Debounce）
 * - 被动事件监听
 * - IntersectionObserver 封装
 */

// ============================================================
// 节流函数
// ============================================================

/**
 * 节流函数：在指定时间内只执行一次
 *
 * 使用场景：滚动事件、鼠标移动、窗口调整
 *
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, delay - (now - lastTime));
    }
  };
}

// ============================================================
// 防抖函数
// ============================================================

/**
 * 防抖函数：在指定时间内没有新调用时才执行
 *
 * 使用场景：输入框搜索、窗口调整结束、表单验证
 *
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, delay);
  };
}

// ============================================================
// requestAnimationFrame 封装
// ============================================================

/**
 * 使用 requestAnimationFrame 的节流函数
 *
 * 比普通节流更高效，与浏览器渲染同步
 *
 * @param fn 要执行的函数
 * @returns rAF 节流后的函数
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (rafId !== null) {
      return;
    }

    rafId = requestAnimationFrame(() => {
      fn.apply(this, args);
      rafId = null;
    });
  };
}

// ============================================================
// 被动事件监听
// ============================================================

/**
 * 添加被动事件监听器
 *
 * 被动监听器不会调用 preventDefault()，浏览器可以优化滚动性能
 *
 * @param target 目标元素
 * @param event 事件名称
 * @param handler 事件处理函数
 * @param options 额外选项
 */
export function addPassiveEventListener(
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
): () => void {
  const passiveOptions: AddEventListenerOptions = {
    ...options,
    passive: true,
  };

  target.addEventListener(event, handler, passiveOptions);

  // 返回移除监听器的函数
  return () => {
    target.removeEventListener(event, handler, passiveOptions);
  };
}

// ============================================================
// IntersectionObserver 封装
// ============================================================

interface ObserveOptions {
  /** 根元素边距 */
  rootMargin?: string;
  /** 可见性阈值 */
  threshold?: number | number[];
  /** 是否只触发一次 */
  once?: boolean;
}

/**
 * IntersectionObserver 封装
 *
 * @param elements 要观察的元素
 * @param callback 回调函数
 * @param options 配置选项
 * @returns 取消观察的函数
 */
export function observeElements(
  elements: HTMLElement[],
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: ObserveOptions = {}
): () => void {
  const { rootMargin = "0px", threshold = 0, once = false } = options;

  const observer = new IntersectionObserver(
    (entries) => {
      callback(entries);

      // 如果只触发一次，观察到后取消
      if (once) {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
          }
        });
      }
    },
    { rootMargin, threshold }
  );

  elements.forEach((el) => observer.observe(el));

  // 返回取消观察的函数
  return () => observer.disconnect();
}

// ============================================================
// 性能监控
// ============================================================

/**
 * 测量函数执行时间
 *
 * @param fn 要测量的函数
 * @param label 标签（用于日志）
 * @returns 函数执行结果
 */
export async function measurePerformance<T>(
  fn: () => Promise<T> | T,
  label: string
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();

  if (process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
  }

  return result;
}

// ============================================================
// 内存优化
// ============================================================

/**
 * 创建带缓存的函数
 *
 * @param fn 要缓存的函数
 * @param keyGenerator 键生成器
 * @returns 带缓存的函数
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);

    // 限制缓存大小
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }

    return result;
  }) as T;
}

// ============================================================
// 虚拟滚动辅助
// ============================================================

/**
 * 计算可见区域的项目
 *
 * @param scrollTop 滚动位置
 * @param viewportHeight 视口高度
 * @param itemHeight 项目高度
 * @param totalItems 总项目数
 * @param overscan 额外渲染的项目数
 * @returns 可见区域的起始和结束索引
 */
export function getVisibleRange(
  scrollTop: number,
  viewportHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 5
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const end = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan
  );

  return { start, end };
}
