'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'whileInView'> {
  children: ReactNode;
  className?: string;
  /** 触发延迟（秒） */
  delay?: number;
  /** 动画持续时间（秒） */
  duration?: number;
  /** 进入视口后是否只播放一次 */
  once?: boolean;
  /** 初始 Y 轴偏移（像素） */
  offsetY?: number;
}

/**
 * Reveal 滚动渐入包装
 * 默认从 opacity:0, y:24 渐入到 opacity:1, y:0。
 * 使用 framer-motion 的 whileInView 触发，仅在元素进入视口时启动。
 */
export function Reveal({
  children,
  className,
  delay = 0,
  duration = 0.6,
  once = true,
  offsetY = 24,
  ...rest
}: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: offsetY }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.15 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
