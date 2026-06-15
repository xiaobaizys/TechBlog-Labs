'use client'

import { useEffect, useRef } from 'react'

/**
 * 光标跟随辉光（仅桌面端 dark mode）
 *
 * 鼠标周围 300px 半径的微弱 amber 径向渐变辉光，
 * 用 CSS radial-gradient 在固定定位的 div 上跟随鼠标移动。
 * pointer-events-none，不影响任何交互。
 *
 * 移动端 / 亮色模式 / prefers-reduced-motion 均跳过。
 */
export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef({ x: -500, y: -500 })

  useEffect(() => {
    // 仅桌面端
    if (typeof window === 'undefined') return
    if (window.innerWidth < 1024) return

    // 检查 dark mode
    const html = document.documentElement
    if (!html.classList.contains('dark')) return

    // 检查 prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motionQuery.matches) return

    const el = glowRef.current
    if (!el) return

    let currentX = -500
    let currentY = -500

    const onMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY }
    }

    const animate = () => {
      // 平滑插值（lerp 0.08 → 轻微滞后感）
      currentX += (targetRef.current.x - currentX) * 0.08
      currentY += (targetRef.current.y - currentY) * 0.08

      if (el) {
        el.style.background = `radial-gradient(600px circle at ${currentX}px ${currentY}px, rgba(242,166,90,0.06) 0%, rgba(242,166,90,0.02) 40%, transparent 70%)`
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    rafRef.current = requestAnimationFrame(animate)

    // 监听主题切换
    const observer = new MutationObserver(() => {
      if (!html.classList.contains('dark')) {
        if (el) el.style.background = 'none'
      }
    })
    observer.observe(html, { attributes: true, attributeFilter: ['class'] })

    return () => {
      window.removeEventListener('mousemove', onMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ background: 'none' }}
      aria-hidden="true"
    />
  )
}
