"use client";

import { useEffect, useState, memo } from "react";
import { useTheme } from "next-themes";

/**
 * 主题切换按钮（顶栏最右）
 *
 *  - 浅色模式显示月亮（点击切到深色）
 *  - 深色模式显示太阳（点击切到浅色）
 *  - 客户端水合后渲染对应图标，避免 SSR 不一致
 *
 *  抽出为独立文件 + memo 包裹：父级 setHidden / setMobileOpen 变更
 *  不会触发本组件重渲染。
 */
function ThemeToggleImpl() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="vitalog-topbar__theme"
      aria-label={isDark ? "切换到浅色主题" : "切换到深色主题"}
      title={isDark ? "切换到浅色主题" : "切换到深色主题"}
    >
      {/* 太阳：当前深色时显示，点击 → 切到浅色 */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={`vitalog-topbar__theme-sun ${isDark ? "" : "is-hidden"}`}
      >
        <circle cx="12" cy="12" r="3.5" fill="currentColor" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1="12"
            y1="3"
            x2="12"
            y2="5.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            transform={`rotate(${deg} 12 12)`}
          />
        ))}
      </svg>
      {/* 月亮：当前浅色时显示，点击 → 切到深色 */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={`vitalog-topbar__theme-moon ${isDark ? "is-hidden" : ""}`}
      >
        <path
          d="M20 14.5A8 8 0 0 1 9.5 4a1 1 0 0 0-1.3-1.3 9.5 9.5 0 1 0 13.1 13.1A1 1 0 0 0 20 14.5Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}

export const ThemeToggle = memo(ThemeToggleImpl);
export default ThemeToggle;
