'use client'

import { useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { UserAvatar } from '@/components/user/UserAvatar'

/**
 * 首页 Hero 开场（参考 taozhiyy.top 风格）
 *
 * 布局：
 *  - 顶部 topbar：左小头像 + 换一张（切换背景图），右 nav 链接
 *  - 全屏背景图（fixed position），4 张可切，默认 background (1).png
 *  - 左上角："WELCOME" 巨字 + 副标 + EXPLORE 按钮
 *
 * 滚动驱动（仿 taozhiyy 效果）：
 *  - 背景图倾斜（rotate）+ 缩小（scale）
 *  - 内容向上飞
 *  - 下方面板淡入
 *
 * 加载策略（首屏优化）：
 *  - 仅预加载第 1 张（默认展示）
 *  - 用户首次点击"换一张"时，预先 fetch 下一张到缓存
 *  - 其余图片按访问顺序 lazy fetch，避开首屏 ~1.5MB 图片瀑布
 */
const HERO_BGS = [
  '/image/background%20(1).png', // 默认 · 立即预加载
  '/image/background%20(2).jpg',
  '/image/background%20(3).jpg',
  '/image/background%20(4).jpg',
] as const

export function HeroIntro() {
  const ref = useRef<HTMLElement>(null)
  const [bgIndex, setBgIndex] = useState(0)
  const { data: session } = useSession()
  const user = session?.user
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  // 背景图滚动：轻微放大 + 整体倾斜 + 缩小，揭示下方
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.0, 0.85])
  const bgRotate = useTransform(scrollYProgress, [0, 1], [0, -6])
  const bgY = useTransform(scrollYProgress, [0, 1], [0, -60])

  // 内容视差
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -150])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  // 顶部 topbar：滚出时降低透明度
  const topbarOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  /* 预取下一张背景图到浏览器缓存。
   * - 仅当用户首次点击「换一张」时触发，确保首屏不会预取
   * - 用 <link rel="prefetch"> 走浏览器原生 HTTP 缓存，不阻塞主线程
   * - 命中失败也不报错（fetch 本身就是 best-effort）
   */
  const prefetched = useRef<Set<number>>(new Set([0]))
  const prefetchNext = (current: number) => {
    const next = (current + 1) % HERO_BGS.length
    if (prefetched.current.has(next)) return
    prefetched.current.add(next)
    if (typeof window === 'undefined') return
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = 'image'
    link.href = HERO_BGS[next]
    document.head.appendChild(link)
  }

  function handleExplore(e: React.MouseEvent) {
    e.preventDefault()
    const target = document.getElementById('shi-0')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function switchCover() {
    setBgIndex((i) => {
      const next = (i + 1) % HERO_BGS.length
      prefetchNext(next)
      return next
    })
  }

  return (
    <motion.section ref={ref} className="vitalog-hero-intro" aria-label="开场">
      {/* 全屏背景图：4 张可切，AnimatePresence 做交叉淡入 */}
      <motion.div className="vitalog-hero-intro__bg" style={{ scale: bgScale, rotate: bgRotate, y: bgY }} aria-hidden>
        <AnimatePresence initial={false}>
          <motion.img key={bgIndex} src={HERO_BGS[bgIndex]} alt="" className="vitalog-hero-intro__bg-img" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }} />
        </AnimatePresence>
        {/* 暗化蒙版：保证左上文清晰可读 */}
        <div className="vitalog-hero-intro__bg-veil" />
      </motion.div>

      {/* 顶部 topbar：头像 + SWITCH COVER + 导航 */}
      <motion.div className="vitalog-hero-intro__topbar" style={{ opacity: topbarOpacity }}>
        <div className="vitalog-hero-intro__topbar-inner">
          <div className="vitalog-hero-intro__topbar-left">
            <div className="vitalog-hero-intro__avatar" aria-label={user ? `${user.name ?? "我"}的头像` : "当前头像"}>
              {user ? (
                <UserAvatar
                  name={user.name}
                  image={user.image}
                  userId={user.id}
                  size="sm"
                  className="h-full w-full"
                />
              ) : (
                <span className="vitalog-hero-intro__avatar-dot" />
              )}
            </div>
            <div className="vitalog-hero-intro__user">
              <span className="vitalog-hero-intro__user-name">{user?.name ?? "生·息者"}</span>
              <span className="vitalog-hero-intro__user-bio">用文字记录十二时辰</span>
            </div>
            <button type="button" onClick={switchCover} className="vitalog-hero-intro__switch" data-cursor="hover">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              <span>换一张</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* 主内容：左上角欢迎 */}
      <div className="vitalog-hero-intro__content">
        <motion.div className="vitalog-hero-intro__hello" style={{ y: contentY, opacity: contentOpacity }}>
          <motion.h1 className="vitalog-hero-intro__title" initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}>
            欢 迎
          </motion.h1>

          <motion.p className="vitalog-hero-intro__sub" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.7 }}>
            一切，才刚刚开始
          </motion.p>

          <motion.button type="button" onClick={handleExplore} data-cursor="hover" className="vitalog-hero-intro__cta" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.95 }}>
            <span className="vitalog-hero-intro__cta-arrow" aria-hidden>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </span>
            <span>EXPLORE</span>
          </motion.button>
        </motion.div>
      </div>

      {/* 滚动到底部出现的「WELCOME TO 项目名」面板 */}
      <motion.div
        className="vitalog-hero-intro__below"
        style={{
          opacity: useTransform(scrollYProgress, [0.6, 1], [0, 1]),
        }}
      >
        <span>WELCOME TO 生息日志</span>
      </motion.div>
    </motion.section>
  )
}

export default HeroIntro
