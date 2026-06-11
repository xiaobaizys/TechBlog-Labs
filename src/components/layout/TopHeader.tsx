'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { UserMenu } from './topbar/UserMenu'
import { ThemeToggle } from './topbar/ThemeToggle'

/**
 * 顶部导航栏 TopHeader
 *
 *  职责：渲染品牌 + 主导航 + 登录/用户区 + 主题切换
 *
 *  性能优化（拆 server/client 思路）：
 *   - 本组件本身是 client（因为 usePathname / useState / useSession / useTheme）
 *   - 桌面端用户菜单 → 拆为 topbar/UserMenu.tsx，React.memo 包裹
 *   - 主题切换 → 拆为 topbar/ThemeToggle.tsx，React.memo 包裹
 *   - 导航条目数组 useMemo 缓存，避免每次渲染重新构造
 *   - 滚动回调 useCallback 化
 *
 *  整体好处：父级 setHidden / setMobileOpen 触发的重渲染不会带动
 *  头像/主题图标 / 菜单重新构建；同时 JSX 可读性更好。
 *
 *  行为保持：
 *   - 默认固定顶部，宽度 100%
 *   - 向下滚动 > 100px 自动平滑隐藏
 *   - 向上滚动时立即平滑显示
 *   - 移动端（≤720px）折叠为汉堡菜单
 *   - 顶部进度条（琥珀色）
 */
const TRIGGER_DISTANCE = 100

export function TopHeader() {
  const pathname = usePathname()
  const [hidden, setHidden] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session, status } = useSession()
  const isAuth = status === 'authenticated'
  const isLoading = status === 'loading'
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN'
  const lastY = useRef(0)
  const ticking = useRef(false)

  /* 注：导航 prefetch 由每个 <Link prefetch={true}> 自动处理：
   *   - 在视口内出现的 Link 会被 Next.js 提前 prefetch RSC payload
   *   - 之前用 import("next/navigation") 动态拿 router 的写法是错的：
   *     next/navigation 根本不导出 router（那是 next/router 旧 API），
   *     解构出来是 undefined，调 prefetch 必抛 TypeError。
   *   显式 import useRouter() 也可以工作但没必要，反而增加一个 hook。
   */

  /* 滚动方向检测 —— useCallback 让引用稳定 */
  const onScroll = useCallback(() => {
    if (ticking.current) return
    ticking.current = true
    requestAnimationFrame(() => {
      const y = window.scrollY
      const dy = y - lastY.current
      if (Math.abs(dy) < 6) {
        ticking.current = false
        return
      }
      if (y < TRIGGER_DISTANCE) {
        setHidden(false)
      } else if (dy > 0) {
        setHidden(true)
        setMobileOpen(false)
      } else {
        setHidden(false)
      }
      lastY.current = y
      ticking.current = false
    })
  }, [])

  useEffect(() => {
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

  /* 导航条目：useMemo 缓存，避免每次渲染重新构造 */
  const navItems = useMemo(
    () => [
      { href: '/', label: '首页', en: 'HOME' },
      { href: '/blog', label: '博客', en: 'BLOG' },
      { href: '/projects', label: '项目', en: 'PROJECTS' },
      { href: '/life', label: '生活', en: 'LIFE' },
      { href: '/about', label: '关于', en: 'ABOUT' },
    ],
    [],
  )

  return (
    <header className={`vitalog-topbar ${hidden ? 'is-hidden' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`} role="banner">
      <div className="vitalog-topbar__inner">
        {/* 左：品牌（最左） */}
        <Link href="/" prefetch={true} className="vitalog-topbar__brand" aria-label="回到首页">
          <span className="vitalog-topbar__brand-zh">生息日志</span>
          <span className="vitalog-topbar__brand-sub">LIFE · BREATH · GROW</span>
        </Link>

        {/* 桌面端：主导航 */}
        <nav className="vitalog-topbar__nav" aria-label="主导航">
          {navItems.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href} prefetch={true} className={`vitalog-topbar__nav-item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined} data-cursor="hover">
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* 关于按钮右侧：登录 / 用户菜单（桌面端） */}
        <div className="vitalog-topbar__auth">
          {isLoading && <span className="vitalog-topbar__auth-skel" aria-hidden />}
          {!isLoading && !isAuth && (
            <Link href="/login" className="vitalog-topbar__auth-login" data-cursor="hover">
              登录
            </Link>
          )}
          {!isLoading && isAuth && <UserMenu email={session?.user?.email} name={session?.user?.name} image={session?.user?.image} userId={session?.user?.id} isAdmin={isAdmin} />}
        </div>

        {/* 移动端：汉堡按钮 */}
        <button type="button" className="vitalog-topbar__burger" aria-label={mobileOpen ? '关闭菜单' : '打开菜单'} aria-expanded={mobileOpen} onClick={() => setMobileOpen((o) => !o)}>
          <span className={`vitalog-topbar__burger-line ${mobileOpen ? 'is-x-1' : ''}`} />
          <span className={`vitalog-topbar__burger-line ${mobileOpen ? 'is-x-2' : ''}`} />
          <span className={`vitalog-topbar__burger-line ${mobileOpen ? 'is-x-3' : ''}`} />
        </button>

        {/* 最右：主题切换 */}
        <ThemeToggle />
      </div>

      {/* 移动端下拉菜单 */}
      <AnimatePresence>{mobileOpen && <MobileDrawer navItems={navItems} pathname={pathname} isLoading={isLoading} isAuth={isAuth} isAdmin={isAdmin} session={session} onClose={() => setMobileOpen(false)} />}</AnimatePresence>
    </header>
  )
}

/* ============================================================
 *  模块常量
 * ============================================================ */
const NAV_HREFS = ['/', '/blog', '/projects', '/life', '/about'] as const

/* ============================================================
 *  移动端下拉（独立组件，逻辑不复杂，但和 TopHeader 解耦后易读很多）
 * ============================================================ */
type MobileDrawerProps = {
  navItems: Array<{ href: string; label: string; en: string }>
  pathname: string
  isLoading: boolean
  isAuth: boolean
  isAdmin: boolean
  session: ReturnType<typeof useSession>['data']
  onClose: () => void
}

function MobileDrawer({ navItems, pathname, isLoading, isAuth, isAdmin, session, onClose }: MobileDrawerProps) {
  return (
    <motion.nav className="vitalog-topbar__drawer" aria-label="导航菜单" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}>
      {navItems.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link key={item.href} href={item.href} onClick={onClose} className={`vitalog-topbar__drawer-item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
            <span className="vitalog-topbar__drawer-zh">{item.label}</span>
            <span className="vitalog-topbar__drawer-en">{item.en}</span>
          </Link>
        )
      })}

      <span className="vitalog-topbar__drawer-sep" />
      {!isLoading && !isAuth && (
        <>
          <Link href="/login" onClick={onClose} className="vitalog-topbar__drawer-item">
            <span className="vitalog-topbar__drawer-zh">登录</span>
            <span className="vitalog-topbar__drawer-en">LOGIN</span>
          </Link>
          <Link href="/register" onClick={onClose} className="vitalog-topbar__drawer-item vitalog-topbar__drawer-item--accent">
            <span className="vitalog-topbar__drawer-zh">注册</span>
            <span className="vitalog-topbar__drawer-en">SIGN UP</span>
          </Link>
        </>
      )}
      {!isLoading && isAuth && (
        <>
          <Link href="/profile" onClick={onClose} className="vitalog-topbar__drawer-item">
            <span className="vitalog-topbar__drawer-zh">个人中心</span>
            <span className="vitalog-topbar__drawer-en">PROFILE</span>
          </Link>
          {isAdmin && (
            <Link href="/admin" onClick={onClose} className="vitalog-topbar__drawer-item vitalog-topbar__drawer-item--accent">
              <span className="vitalog-topbar__drawer-zh">后台管理</span>
              <span className="vitalog-topbar__drawer-en">ADMIN</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              onClose()
              import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/' }))
            }}
            className="vitalog-topbar__drawer-item vitalog-topbar__drawer-item--danger"
          >
            <span className="vitalog-topbar__drawer-zh">退出登录</span>
            <span className="vitalog-topbar__drawer-en">SIGN OUT</span>
          </button>
        </>
      )}
    </motion.nav>
  )
}

export default TopHeader
