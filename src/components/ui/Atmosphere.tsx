'use client';

/**
 * Atmosphere 氛围层
 * ------------------------------------------------------------
 * 三层固定定位视觉效果，营造夜空+城市+山脉的氛围：
 *   1. 银河光带（顶部 70vh）
 *   2. 城市光晕（底部 45vh，自带遮罩渐隐）
 *   3. 山脉剪影（底部 32vh，clip-path 勾勒山线）
 *
 * 主题感知：
 *   - 仅在 .dark 模式下显示（浅色主题完全隐藏）
 *   - 整体强度比 v1 更柔和，避免喧宾夺主
 */
export function Atmosphere() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[1] hidden dark:block overflow-hidden"
    >
      {/* 银河光带 */}
      <div className="absolute top-0 left-0 right-0 h-[70vh] bg-milky-way opacity-80" />

      {/* 城市光晕：使用 mask-gradient 让顶部渐隐、与夜空自然过渡 */}
      <div className="absolute bottom-0 left-0 right-0 h-[45vh] bg-city-horizon mask-gradient" />

      {/* 山脉剪影（替代原树林，更柔和） */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-forest clip-path-mountain" />
    </div>
  );
}

export default Atmosphere;
