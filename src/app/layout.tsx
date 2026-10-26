import type { Metadata } from 'next'
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google'
import dynamic from 'next/dynamic'
import { getConfig } from '@/lib/config'
import { getActiveHomeBackgrounds } from '@/lib/home-backgrounds-cache'
import { LazyOnIdle } from '@/components/util/LazyMount'
import { Providers } from './providers'
import './globals.css'

// 延迟加载装饰性/交互性组件 —— 不阻塞首屏渲染
const Starfield = dynamic(() => import('@/components/ui/Starfield').then((m) => m.Starfield), { ssr: false })
const Atmosphere = dynamic(() => import('@/components/ui/Atmosphere').then((m) => m.Atmosphere), { ssr: false })
const AppShell = dynamic(() => import('@/components/layout/AppShell').then((m) => m.AppShell), { ssr: false })

const ServiceWorkerRegistration = dynamic(() => import('@/components/layout/ServiceWorkerRegistration').then((m) => m.ServiceWorkerRegistration), { ssr: false })

// 访客统计上报器：浏览器空闲时读取 middleware 注入的 header 并 POST /api/visit
const VisitReporter = dynamic(() => import('@/components/analytics/VisitReporter').then((m) => m.VisitReporter), { ssr: false })

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

/**
 * 动态生成 metadata — 从数据库读取站点标题和描述
 */
export async function generateMetadata(): Promise<Metadata> {
  let siteTitle = 'VitaLog · 生息日志'
  let siteDescription = '技术博客与创意实验室'
  let seoKeywords = '技术博客,编程,Next.js,React'

  try {
    siteTitle = await getConfig('site_title')
    siteDescription = await getConfig('site_description')
    seoKeywords = await getConfig('seo_keywords')
  } catch {
    // 数据库不可达时使用默认值
  }

  return {
    title: {
      default: siteTitle,
      template: `%s | ${siteTitle}`,
    },
    description: siteDescription,
    keywords: seoKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
    authors: [{ name: siteTitle }],
    metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
    icons: {
      icon: '/image/logo.png',
      shortcut: '/image/logo.png',
      apple: '/image/logo.png',
    },
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      siteName: siteTitle,
    },
    manifest: '/manifest.json',
    // Apple PWA 支持
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: siteTitle,
    },
    // 其他 PWA 相关
    other: {
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
      'msapplication-TileColor': '#0a0a0a',
      'msapplication-tap-highlight': 'no',
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 预取首屏背景图（命中 Redis/内存缓存），用于 head preload，减少 LCP
  let firstHeroBg: string | null = null
  try {
    const backgrounds = await getActiveHomeBackgrounds()
    firstHeroBg = backgrounds[0]?.url ?? null
  } catch {
    // 降级：不预加载任何图片
  }

  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${inter.variable} ${playfair.variable} ${jetbrains.variable}`}>
      <head>
        {/* 预连接常见静态资源域，降低 DNS/TCP 握手耗时 */}
        <link rel="preconnect" href="/" />
        {firstHeroBg && <link rel="preload" as="image" href={firstHeroBg} fetchPriority="high" />}
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground relative overflow-x-hidden transition-colors duration-300">
        {/* PWA Service Worker 注册 */}
        <ServiceWorkerRegistration />

        {/* 访客统计上报（空闲时执行，不阻塞渲染） */}
        <VisitReporter />

        {/* 氛围层：星空画布 + 银河/城市/山脉（仅 dark 模式显示）
            用 LazyOnIdle 推迟到浏览器空闲/1.5s 后挂载，避免抢占首屏渲染 */}
        <LazyOnIdle timeout={1200}>
          <Starfield />
          <Atmosphere />
        </LazyOnIdle>
        {/* 业务内容置于氛围层之上 */}
        <div className="relative z-10 flex flex-col flex-1">
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </div>
      </body>
    </html>
  )
}
