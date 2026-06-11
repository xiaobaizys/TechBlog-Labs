"use client";

import { useEffect, useState } from "react";
import {
  useScroll,
  useMotionValue,
  useTransform,
  MotionValue,
} from "framer-motion";
import { useTheme } from "next-themes";
import { SHICHEN } from "@/lib/shichen";

/**
 * 滚动驱动的固定背景层
 *
 * 核心思路（参考 GSAP ScrollTrigger scrub）：
 *  - 单一 fixed 层铺满视口（z-index 0）
 *  - 通过 useScroll 监听整个十二时辰列表的滚动进度
 *  - 把 [0, 1] 的进度映射到 12 个 section 背景色
 *  - 颜色变化与滚动位置 1:1 同步（无 CSS transition 延迟）
 *  - 切换主题时同步切换颜色（light/dark 双套）
 *
 * 辰巳午未 水平面板特殊处理：
 *  - pin 期间 window.scrollY 仍在变（pin 占了 (n-1)*100vh），
 *    但 useScroll() 给出的整体 scrollYProgress 只走完 4/12→7/12 这段
 *    会过快掠过 4 个色，不够细腻
 *  - 监听 'noon:progress' 事件，用子进度在 辰巳午未 4 个色之间精确插值
 */
const NOON_START = 4;
const NOON_END = 7;

export function BgLayer() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  // 当前主题下的 12 段颜色
  const colors = SHICHEN.map((s) => (isDark ? s.bg.dark : s.bg.light));

  // 整页滚动进度 [0, 1]（整个十二时辰列表）
  const { scrollYProgress } = useScroll();

  // 颜色锚点：12 个 section 均分滚动进度
  const stops = colors.map((_, i) => i / (colors.length - 1));

  // useTransform 自动对 hex 颜色做线性插值
  const baseBg: MotionValue<string> = useTransform(
    scrollYProgress,
    stops,
    colors
  );

  // 当 noon 面板激活时，使用 noon 子进度在 NOON_START..NOON_END 颜色间插值
  const noonProgress = useMotionValue(0);
  const noonActive = useMotionValue(0); // 0/1
  const noonColors = colors.slice(NOON_START, NOON_END + 1);
  const noonStops = noonColors.map(
    (_, i) => i / (noonColors.length - 1)
  );
  const noonBg: MotionValue<string> = useTransform(
    noonProgress,
    noonStops,
    noonColors
  );

  // 综合输出：noonActive = 1 时用 noonBg，否则用 baseBg
  // 用自定义合并：监听两个值手动写入 style（useTransform 最多支持多对一）
  const [bg, setBg] = useState<string>(colors[0]);

  /* 性能优化：document 隐藏时彻底跳过 setBg，导航离开首页时不浪费一次 React re-render
   *  - 滚动驱动 baseBg / noonBg 每帧都会触发 "change"
   *  - 隐藏时直接 short-circuit，连 setBg 比较都省了
   *  - 这里直接用 motion 的 .on() 订阅，替代原来的 useMotionValueEvent，避免双重订阅
   */
  useEffect(() => {
    const flush = () => {
      if (document.hidden) return;
      setBg(noonActive.get() >= 0.5 ? noonBg.get() : baseBg.get());
    };
    // 初次挂载时同步一次
    flush();
    const subA = baseBg.on("change", flush);
    const subB = noonBg.on("change", flush);
    return () => {
      subA();
      subB();
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
      setBg(baseBg.get());
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
      className="vitalog-bg-layer"
      aria-hidden
      style={{ backgroundColor: bg }}
    />
  );
}

export default BgLayer;
