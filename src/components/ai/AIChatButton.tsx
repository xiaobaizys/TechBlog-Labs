"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AIChatDialog } from "./AIChatDialog";

/**
 * 悬浮入口按钮
 * 设计：胶囊型（pill），琥珀渐变背景 + 发光阴影
 * - 关闭时显示「✨ AI助手」
 * - 打开时显示「✕ 关闭」
 * - 用 framer-motion 做旋转 + 淡入淡出
 *  - 支持拖拽移动位置（移动端友好）
 *  - 拖拽时显示阴影轨迹反馈，方便看清当前位置
 *
 * 位置约定（与 BackToTop 一起）：
 *   - AI 按钮：z-[9999]，支持拖拽
 *   - TOP 按钮：right-6 bottom-20 (z-40)  ← 在默认位置上方，避免重叠
 *   - Dialog：   跟随按钮位置 (z-[9999])
 *   - 确保 AI 助手在任何页面元素之上（最高层级）
 */
export function AIChatButton() {
  const [open, setOpen] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* 拖拽约束区域 */}
      <div
        ref={constraintsRef}
        className="fixed inset-0 z-0 pointer-events-none"
      />

      {/* 悬浮按钮
         - 桌面（sm+）：胶囊 + 图标 + 文字
         - 移动端（< sm）：48×48 圆 + 仅图标，更省空间
         - 支持拖拽移动
      */}
      <motion.button
        drag
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={constraintsRef}
        whileDrag={{ scale: 1.08, cursor: "grabbing", y: 4 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          // 只有非拖拽时才触发点击
          if (e.detail === 1) {
            setOpen((v) => !v);
          }
        }}
        className="group fixed z-[9999] flex h-12 w-12 sm:w-auto cursor-grab items-center justify-center sm:justify-start gap-2 rounded-full bg-gradient-to-r from-amber to-amber-bright px-0 sm:px-5 text-night transition-all hover:shadow-[0_8px_24px_rgba(242,166,90,0.5)]"
        style={{ right: "1.5rem", bottom: "1.5rem" }}
        aria-label={open ? "关闭 AI 助手" : "打开 AI 助手"}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        {/* 拖拽阴影 - 始终显示 */}
        <motion.span
          animate={{
            opacity: [0.5, 0.8, 0.5],
            scale: 1.05,
            y: [4, 6, 4]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-amber/30 to-amber-bright/20 blur-sm"
          aria-hidden
        />
        {/* 主阴影效果 */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full shadow-[0_4px_12px_rgba(242,166,90,0.4)] opacity-100 transition-opacity duration-200"
          aria-hidden
        />
        {/* 闪光 */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ backgroundSize: "200% 100%" }}
        />
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline text-sm font-semibold tracking-wide">关闭</span>
            </motion.span>
          ) : (
            <motion.span
              key="ask"
              initial={{ opacity: 0, scale: 0.6, rotate: 90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: -90 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2"
            >
              {/* 闪光星星 icon */}
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2z" />
                <path d="M19 14l.85 2.65L22.5 17.5l-2.65.85L19 21l-.85-2.65L15.5 17.5l2.65-.85L19 14z" opacity="0.7" />
              </svg>
              <span className="hidden sm:inline text-sm font-semibold tracking-wide">AI助手</span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* 对话框 - 跟随按钮位置 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[9999] w-[380px] max-w-[calc(100vw-3rem)]"
            style={{ right: "1.5rem", bottom: "6rem" }}
          >
            <AIChatDialog onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
