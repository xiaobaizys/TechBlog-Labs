'use client'

import { useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { SHICHEN, DECO_SVG } from '@/lib/shichen'

/* 辰巳午未 单独抽出为水平 GSAP 面板。
 * 关键：用 next/dynamic + ssr:false 异步加载，首屏不进 GSAP 包。
 * GSAP + ScrollTrigger ~80KB，按需 fetch 节省首屏 JS。
 * 占位高度 4 个 100vh 维持原文档流高度，避免布局抖动。
 */
const NoonHorizontalPanel = dynamic(() => import('./NoonHorizontalPanel').then((m) => m.NoonHorizontalPanel), {
  ssr: false,
  loading: () => <div className="vitalog-noon-pin" style={{ minHeight: '400vh' }} aria-hidden />,
})

const NOON_PANEL_START = 4
const NOON_PANEL_END = 7

/**
 * 解析 "15:00 — 17:00" 格式的时间段，提取起止小时
 */
function parseShiRange(range: string): { start: number; end: number } {
  const match = range.match(/(\d{1,2}):\d{2}\s*[—–-]\s*(\d{1,2}):\d{2}/)
  if (!match) return { start: 0, end: 2 }
  return { start: parseInt(match[1], 10), end: parseInt(match[2], 10) }
}

/**
 * 生成 400×400 的时间刻度盘 SVG
 * - 4 层同心环（外环极淡、内环稍显）
 * - 8 个刻度（45° 等分，对应 2 小时中的 8 刻 = 15 分钟/刻）
 * - 4 个方位显示时辰起止小时
 * - 中心嵌入原有 deco SVG
 */
function buildDialSVG(startHour: number, endHour: number, decoSVG: string): string {
  const next = (n: number) => (n + 1) % 24
  const pad = (n: number) => n.toString().padStart(2, '0')
  const cx = 200
  const cy = 200
  // 8 刻刻度线：45° 等分
  const angles = [0, 45, 90, 135, 180, 225, 270, 315]
  const ticks = angles
    .map((deg) => {
      const rad = (deg * Math.PI) / 180
      const r1 = 175
      const r2 = deg % 90 === 0 ? 158 : 168
      const x1 = cx + Math.sin(rad) * r1
      const y1 = cy - Math.cos(rad) * r1
      const x2 = cx + Math.sin(rad) * r2
      const y2 = cy - Math.cos(rad) * r2
      return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="currentColor" stroke-width="${deg % 90 === 0 ? 0.6 : 0.35}" opacity="${deg % 90 === 0 ? 0.55 : 0.35}" />`
    })
    .join('')
  return `<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
    <circle cx="${cx}" cy="${cy}" r="195" fill="none" stroke="currentColor" stroke-width="0.3" opacity="0.18" />
    <circle cx="${cx}" cy="${cy}" r="175" fill="none" stroke="currentColor" stroke-width="0.3" opacity="0.3" stroke-dasharray="2 4" />
    <g>${ticks}</g>
    <circle cx="${cx}" cy="${cy}" r="120" fill="none" stroke="currentColor" stroke-width="0.4" opacity="0.4" />
    <circle cx="${cx}" cy="${cy}" r="100" fill="none" stroke="currentColor" stroke-width="0.3" opacity="0.5" />
    <g font-family="ui-monospace, monospace" font-size="11" fill="currentColor" opacity="0.7" letter-spacing="0.05em">
      <text x="${cx}" y="20" text-anchor="middle">${pad(startHour)}</text>
      <text x="380" y="204" text-anchor="middle">${pad(next(startHour))}</text>
      <text x="${cx}" y="392" text-anchor="middle">${pad(endHour)}</text>
      <text x="20" y="204" text-anchor="middle">${pad(next(startHour))}</text>
    </g>
    <g transform="translate(${cx - 70}, ${cy - 70}) scale(1.4)" opacity="0.7">
      ${decoSVG.replace(/^<svg[^>]*>|<\/svg>$/g, '')}
    </g>
  </svg>`
}

/**
 * 时辰配点（每节 6 个位置 / 大小不同的浮点，呈现氛围感）
 * 使用 startHour 做种子化偏移，确保不同节不雷同
 */
const DOTS_LAYOUT: ReadonlyArray<{ top: string; left: string; size: number; opacity: number; delay: number }> = [
  { top: '12%', left: '62%', size: 4, opacity: 0.5, delay: 0 },
  { top: '22%', left: '78%', size: 3, opacity: 0.35, delay: 0.6 },
  { top: '38%', left: '70%', size: 5, opacity: 0.45, delay: 1.2 },
  { top: '56%', left: '84%', size: 2.5, opacity: 0.4, delay: 0.3 },
  { top: '72%', left: '64%', size: 4, opacity: 0.5, delay: 0.9 },
  { top: '84%', left: '78%', size: 3, opacity: 0.35, delay: 1.5 },
]

/**
 * 十二时辰主体（核心创新视觉）
 *
 *  - 12 个全屏 section，按时间顺序排列
 *  - 背景由 BgLayer 滚动驱动（仿 GSAP scrub），section 自身透明
 *  - 渐入动画：char / quote / range / body / meta 阶梯出现
 *  - 右侧 SVG 装饰（每个时辰独享）
 *  - 每个 section 底部有「行至此时」CTA，跳到该节对应的真实落地页
 *  - 通过 CSS 变量控制浅 / 深色双套配色
 *
 * 首个 section（子 · 夜半）启用 hero 模式：
 *  - 仿 GSAP 巨字版式：「夜」「半」两字撑满视口宽度
 *  - 每个字独立入场动画（旋转 + 上升 + 渐入）
 *  - 滚动视差：每字不同速率
 *  - 字符悬停：颜色变金 + 抬升
 */
export function TwelveShichen() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="vitalog-shi-list">
      {SHICHEN.map((s, i) => {
        // 辰巳午未 合并为水平滚动面板，仅在起始位置插入一次
        if (i === NOON_PANEL_START) {
          return <NoonHorizontalPanel key="noon-panel" />
        }
        if (i > NOON_PANEL_START && i <= NOON_PANEL_END) {
          return null
        }
        return <ShiSection key={s.char} s={s} idx={i} />
      })}
    </div>
  )
}

function ShiSection({ s, idx }: { s: (typeof SHICHEN)[number]; idx: number }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  // 右侧 SVG 装饰随滚动轻微平移 + 缩放
  const artY = useTransform(scrollYProgress, [0, 1], [40, -40])
  const artScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.95])
  // 时辰字水印：视差比装饰画幅度更大，营造前后景层次
  const wmY = useTransform(scrollYProgress, [0, 1], [70, -70])
  // 右侧新装饰：时间刻度盘 - 缓慢旋转 + 视差
  const dialY = useTransform(scrollYProgress, [0, 1], [20, -20])
  const dialRotate = useTransform(scrollYProgress, [0, 1], [-6, 6])
  // 右侧新装饰：竖排时辰名 - 反向视差
  const vnameY = useTransform(scrollYProgress, [0, 1], [-30, 30])
  // 右侧新装饰：时刻数字 - 缓慢上浮
  const timecodeY = useTransform(scrollYProgress, [0, 1], [10, -10])
  // 右侧新装饰：浮动光点 - 飘动
  const dotsY = useTransform(scrollYProgress, [0, 1], [15, -15])

  // 图片模式：滚动驱动 clip-path 平行四边形裁剪（仿 GSAP 演示 1）
  const cutTop = useTransform(scrollYProgress, [0, 1], [0, 14])
  const cutBottom = useTransform(scrollYProgress, [0, 1], [0, 14])
  const skewRight = useTransform(scrollYProgress, [0, 1], [0, 10])
  const clipPath = useTransform([cutTop, cutBottom, skewRight], ([ct, cb, sk]: number[]) => `polygon(${ct}% 0%, 100% ${sk}%, ${100 - sk}% 100%, 0% ${100 - cb}%)`)
  // 滚动驱动：缩放 1.0 → 1.08 + 3D rotateY 倾斜入场
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.08])
  const imgRotateY = useTransform(scrollYProgress, [0, 0.5, 1], [-10, 0, 10])

  // 渐入动画（进入视口后）
  const reveal = {
    hidden: { opacity: 0, y: 30 },
    show: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay,
        duration: 1.1,
        ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
      },
    }),
  }

  const hasImage = !!s.image
  const imagePos = s.imagePos ?? 'right'
  const { start: startHour, end: endHour } = parseShiRange(s.range)
  const dialHTML = buildDialSVG(startHour, endHour, DECO_SVG[s.deco])

  return (
    <motion.section ref={ref} id={`shi-${idx}`} data-shi-idx={idx} className={`vitalog-shi ${hasImage ? `vitalog-shi--has-img vitalog-shi--img-${imagePos}` : ''}`} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} style={{ ['--shi-accent' as string]: s.accentVar }}>
      {/* 主内容区 */}
      <div className="vitalog-shi__inner">
        <motion.h2 className="vitalog-shi__char" variants={reveal} custom={0}>
          {s.char}
        </motion.h2>

        <motion.p className="vitalog-shi__classical" variants={reveal} custom={0.15}>
          {s.quote}
        </motion.p>

        <motion.p className="vitalog-shi__range" variants={reveal} custom={0.3}>
          <span>{s.range}</span>
          <span className="vitalog-shi__dot">·</span>
          <span>{s.name}</span>
          <span className="vitalog-shi__tag">{s.tag}</span>
        </motion.p>

        <motion.div className="vitalog-shi__body" variants={reveal} custom={0.45}>
          {s.body.split('\n').map((line, k) => (
            <p key={k}>{line}</p>
          ))}
        </motion.div>

        <motion.div className="vitalog-shi__meta" variants={reveal} custom={0.6}>
          {Object.entries(s.meta).map(([k, v]) => (
            <span key={k}>
              <em>{k}</em>
              <strong>{v}</strong>
            </span>
          ))}
        </motion.div>

        <motion.div className="vitalog-shi__cta" variants={reveal} custom={0.75}>
          <Link href={s.href} data-cursor="hover" className="vitalog-shi__cta-link">
            {s.cta}
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </motion.div>
      </div>

      {/* 时辰配图（仿 test-animations.html 滚动裁剪 + 入场透视） */}
      {hasImage && s.image && (
        <motion.div
          className="vitalog-shi__img-frame"
          initial={{ opacity: 0, y: 60, rotateY: 18, rotateX: 6, scale: 0.92 }}
          whileInView={{
            opacity: 1,
            y: 0,
            rotateY: 0,
            rotateX: 0,
            scale: 1,
          }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{
            duration: 1.4,
            ease: [0.22, 0.61, 0.36, 1],
          }}
          style={
            {
              clipPath,
              scale: imgScale,
              rotateY: imgRotateY,
              transformPerspective: 1400,
            } as unknown as React.CSSProperties
          }
        >
          <div className="vitalog-shi__img-wrap">
            <img src={s.image} alt={s.name} className="vitalog-shi__img" loading="lazy" decoding="async" />
            {/* 图片上的渐变蒙版：保证文字层可读 */}
            <div className="vitalog-shi__img-veil" aria-hidden />
            {/* 图片角标：时辰名 */}
            <div className="vitalog-shi__img-caption">
              <span className="vitalog-shi__img-caption-char">{s.char}</span>
              <span className="vitalog-shi__img-caption-text">
                {s.range} · {s.name}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 右侧区域：无图时 = 大字水印 + 时间刻度盘 + 装饰画 + 竖排名 + 时刻数字 + 浮点 */}
      {!hasImage && (
        <>
          {/* 时辰字水印：超大半透明衬线字，铺在装饰画后方 */}
          <motion.div
            className="vitalog-shi__watermark"
            aria-hidden
            style={{ y: wmY, color: s.accentVar }}
          >
            {s.char}
          </motion.div>

          {/* 时间刻度盘：8 刻同心环 + 起止小时，外环极淡营造氛围 */}
          <motion.div
            className="vitalog-shi__dial"
            aria-hidden
            style={{ y: dialY, rotate: dialRotate, color: s.accentVar }}
            dangerouslySetInnerHTML={{ __html: dialHTML }}
          />

          {/* 装饰画：随滚动轻微平移 + 缩放，居于刻度盘中心 */}
          <motion.div
            className="vitalog-shi__art"
            aria-hidden
            style={{ y: artY, scale: artScale, color: s.accentVar }}
            dangerouslySetInnerHTML={{ __html: DECO_SVG[s.deco] }}
          />

          {/* 竖排时辰名：右侧边缘，纵向书写古典名（晡时/日入/黄昏/人定） */}
          <motion.div
            className="vitalog-shi__vname"
            aria-hidden
            style={{ y: vnameY, color: s.accentVar }}
          >
            {s.name.split('').map((c, k) => (
              <span key={k}>{c}</span>
            ))}
          </motion.div>

          {/* 时刻数字：刻度盘下方，等宽大字 */}
          <motion.div
            className="vitalog-shi__timecode"
            aria-hidden
            style={{ y: timecodeY, color: s.accentVar }}
          >
            <span className="vitalog-shi__timecode-hash">#</span>
            <span>{s.range.replace(/\s/g, '')}</span>
          </motion.div>

          {/* 浮动光点：6 颗，氛围感 */}
          <motion.div className="vitalog-shi__dots" aria-hidden style={{ y: dotsY, color: s.accentVar }}>
            {DOTS_LAYOUT.map((d, k) => (
              <span
                key={k}
                className="vitalog-shi__dot"
                style={{
                  top: d.top,
                  left: d.left,
                  width: `${d.size}px`,
                  height: `${d.size}px`,
                  opacity: d.opacity,
                  animationDelay: `${d.delay}s`,
                }}
              />
            ))}
          </motion.div>
        </>
      )}

      {/* 分割线 */}
      <div className="vitalog-shi__divider" />
    </motion.section>
  )
}

export default TwelveShichen
