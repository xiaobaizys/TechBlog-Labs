'use client'

import { motion, type Variants } from 'framer-motion'

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 0.61, 0.36, 1],
    },
  },
}

/**
 * 页面转场包裹器
 *
 * 为子路由页面提供统一的入场动画（fade + slide-up）。
 * 在页面组件的根节点使用，效果与 framer-motion 的 AnimatePresence 兼容。
 *
 * 注意：此组件仅在页面级使用，不会破坏 Next.js Layout 的缓存。
 *
 * @example
 *   export default function BlogPage() {
 *     return (
 *       <PageTransition>
 *         <div>...</div>
 *       </PageTransition>
 *     )
 *   }
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      // 遵循 prefers-reduced-motion：有动效偏好的用户跳过动画
      style={
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? { opacity: 1, transform: 'none' }
          : undefined
      }
    >
      {children}
    </motion.div>
  )
}
