"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";

/**
 * 首页顶部滚动进度条
 *
 *  - 用 framer-motion useScroll 读取页面进度
 *  - 通过 useSpring 平滑跟随
 *  - 顶部固定 2px 细线，琥珀色，左→右增长
 *  - 仅在 hero/十二时辰主体滚动时显示（其他页面可独立使用）
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 32,
    mass: 0.4,
  });

  return (
    <motion.div
      className="vitalog-progress"
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
}

/**
 * 返回顶部按钮
 *
 *  - 滚动超过 1 屏后从下方淡入
 *  - 平滑回滚到顶部（尊重 prefers-reduced-motion）
 *  - 位于右下角，左下角与底部 tab 栏错开
 */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > window.innerHeight * 0.6);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleClick() {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      // 位置用 Tailwind 内联（与 AI 按钮同一 pipeline，避免 CSS 缓存/HMR 不一致）
      //  - 桌面：right-40 bottom-6 (z-40)  ← AI 按钮 (z-50) 左侧 16px
      //  - 移动：right-20 bottom-6 (z-40)  ← AI 按钮 (z-50) 左侧 8px
      className="vitalog-backtotop fixed bottom-6 right-6 z-40 sm:bottom-6 sm:right-40"
      aria-label="返回顶部"
      title="返回顶部"
      initial={false}
      animate={{
        opacity: show ? 1 : 0,
        y: show ? 0 : 12,
        pointerEvents: show ? "auto" : "none",
      }}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      <span className="vitalog-backtotop__label">TOP</span>
    </motion.button>
  );
}
