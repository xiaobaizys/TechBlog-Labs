'use client';

import { useEffect, useState } from 'react';
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
 *
 * 默认从 opacity:0, y:24 渐入到 opacity:1, y:0。
 * 使用 framer-motion 的 whileInView 触发，仅在元素进入视口时启动。
 *
 * 移动端（< 640px）或 prefers-reduced-motion 时直接渲染 children，跳过动画。
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
  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 640;
    setShouldAnimate(!reduced && !isMobile);
  }, []);

  if (!shouldAnimate) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { whileInView, whileHover, whileTap, animate, initial, variants, ...divProps } = rest as Record<string, unknown>;
    return (
      <div className={className} {...(divProps as Record<string, unknown>)}>
        {children}
      </div>
    );
  }

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
