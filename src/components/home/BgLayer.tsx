"use client";

import { useEffect, useRef } from "react";
import { useScroll, useMotionValue, useTransform } from "framer-motion";
import { useTheme } from "next-themes";
import { SHICHEN } from "@/lib/shichen";

/**
 * 滚动驱动的固定背景层（性能优化版）
 *
 * 优化点：
 *  - 用 CSS 变量替代 React state 更新背景色，避免每帧 re-render
 *  - 使用 requestAnimationFrame 节流，确保每帧只更新一次
 *  - 添加 will-change 提示浏览器优化合成层
 *  - 移除 mounted state，直接用 resolvedTheme 判断
 */
const NOON_START = 4;
const NOON_END = 7;

export function BgLayer() {
  const { resolvedTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  const isDark = resolvedTheme === "dark";

  // 当前主题下的 12 段颜色
  const colors = SHICHEN.map((s) => (isDark ? s.bg.dark : s.bg.light));

  // 整页滚动进度 [0, 1]（整个十二时辰列表）
  const { scrollYProgress } = useScroll();

  // 颜色锚点：12 个 section 均分滚动进度
  const stops = colors.map((_, i) => i / (colors.length - 1));

  // useTransform 自动对 hex 颜色做线性插值
  const baseBg = useTransform(scrollYProgress, stops, colors);

  // 当 noon 面板激活时，使用 noon 子进度在 NOON_START..NOON_END 颜色间插值
  const noonProgress = useMotionValue(0);
  const noonActive = useMotionValue(0);
  const noonColors = colors.slice(NOON_START, NOON_END + 1);
  const noonStops = noonColors.map((_, i) => i / (noonColors.length - 1));
  const noonBg = useTransform(noonProgress, noonStops, noonColors);

  // 使用 ref 直接操作 DOM，避免 React re-render
  const rafId = useRef<number>(0);
  const updateBg = () => {
    if (!ref.current || document.hidden) return;
    const newBg = noonActive.get() >= 0.5 ? noonBg.get() : baseBg.get();
    ref.current.style.backgroundColor = newBg;
  };

  // 性能优化：document 隐藏时跳过更新，使用 rAF 节流
  useEffect(() => {
    const flush = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(updateBg);
    };

    flush();
    const subA = baseBg.on("change", flush);
    const subB = noonBg.on("change", flush);
    return () => {
      subA();
      subB();
      cancelAnimationFrame(rafId.current);
    };
  }, [baseBg, noonBg, noonActive]);

  useEffect(() => {
    const onProgress = (e: Event) => {
      const p = (e as CustomEvent<number>).detail ?? 0;
      noonProgress.set(p);
    };
    const onEnter = () => noonActive.set(1);
    const onLeave = () => {
      noonActive.set(0);
      // 离场时立刻用一次整页色
      updateBg();
    };
    window.addEventListener("noon:progress", onProgress);
    window.addEventListener("noon:enter", onEnter);
    window.addEventListener("noon:leave", onLeave);
    return () => {
      window.removeEventListener("noon:progress", onProgress);
      window.removeEventListener("noon:enter", onEnter);
      window.removeEventListener("noon:leave", onLeave);
    };
  }, [baseBg, noonActive, noonProgress]);

  return (
    <div
      ref={ref}
      className="vitalog-bg-layer"
      aria-hidden
      style={{
        backgroundColor: colors[0],
        willChange: "background-color",
      }}
    />
  );
}

export default BgLayer;
