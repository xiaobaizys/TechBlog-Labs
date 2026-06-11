'use client'

import { useEffect, useRef, useState } from 'react'
import { SHICHEN, currentShiIndex } from '@/lib/shichen'

/**
 * 左侧十二时时间带（核心创新导航）
 *
 *  - 12 个时称号 + 起始时间
 *  - 当前时高亮（向左延伸的细线 + 暖光）
 *  - 与滚动同步（IntersectionObserver）—— 8 个垂直时辰段
 *  - 辰巳午未 单独抽出为水平 GSAP 面板：监听 'noon:active' 事件覆盖当前时
 *  - 点击平滑滚动到对应 section（水平段为面板顶部）
 *  - 移入时显示 label，移出自动收起（默认节省空间）
 *  - 仅桌面端显示（> 720px）
 */
export function TimeRibbon() {
  const [active, setActive] = useState<number>(currentShiIndex())
  const ribbonRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-shi-idx]'))
    if (!sections.length) return

    const io = new IntersectionObserver(
      (entries) => {
        // 选中最靠近视口中心的 section
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) {
          const idx = Number(visible[0].target.getAttribute('data-shi-idx'))
          if (!Number.isNaN(idx)) setActive(idx)
        }
      },
      { threshold: [0.3, 0.6, 0.9] },
    )
    sections.forEach((s) => io.observe(s))

    // 辰巳午未 水平面板覆盖当前时
    const onNoonActive = (e: Event) => {
      const idx = (e as CustomEvent<number>).detail
      if (typeof idx === 'number') setActive(idx)
    }
    window.addEventListener('noon:active', onNoonActive)

    /* 页面隐藏时断开 IntersectionObserver，导航离开时减少主线程负担
     *  - 回到首页时再重新挂载
     *  - 8 个 section 的交叉状态变化频率不高，跳过观察对用户感知无影响
     */
    const onVisibility = () => {
      if (document.hidden) {
        io.disconnect()
      } else {
        sections.forEach((s) => io.observe(s))
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      io.disconnect()
      window.removeEventListener('noon:active', onNoonActive)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <aside ref={ribbonRef} className="vitalog-ribbon" aria-label="十二时辰导航">
      {SHICHEN.map((s, i) => {
        const isCurrent = i === active
        const start = s.range.split(' — ')[0]
        return (
          <a
            key={s.char}
            href={`#shi-${i}`}
            data-cursor="hover"
            className={`vitalog-ribbon__item ${isCurrent ? 'is-current' : ''}`}
            aria-current={isCurrent ? 'true' : undefined}
            onClick={(e) => {
              e.preventDefault()
              // 辰巳午未（4-7）跳到水平面板内对应 slide：
              //   辰 → track 起点（offset 0）
              //   巳 → 偏移 1×100vw，午 → 2×100vw，未 → 3×100vw
              // 面板被 ScrollTrigger pin 住，pin 起点 = 父级 .pin-spacer 的顶部，
              // tween 行走 distance = (n-1)·100vw，所以 辰 在 scrollY=startY，
              // 巳/午/未 依次在 startY + k·100vw。
              if (i >= 4 && i <= 7) {
                const panel = document.querySelector<HTMLElement>("[data-shi-panel='noon']")
                if (panel) {
                  const spacer = panel.closest<HTMLElement>('.pin-spacer') ?? panel
                  const startY = spacer.getBoundingClientRect().top + window.scrollY
                  const localIdx = i - 4
                  const vw = window.innerWidth
                  const targetY = startY + localIdx * vw
                  window.scrollTo({ top: targetY, behavior: 'smooth' })
                  return
                }
              }
              const el = document.getElementById(`shi-${i}`)
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            <span className="vitalog-ribbon__dot" />
            <span className="vitalog-ribbon__label">
              {s.char} · {s.name}
            </span>
            <span className="vitalog-ribbon__time">{start}</span>
          </a>
        )
      })}
    </aside>
  )
}

export default TimeRibbon
