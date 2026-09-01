import { NextRequest, NextResponse } from 'next/server'

/**
 * 访客统计中间件
 *
 * 设计要点：
 *  - 仅拦截页面请求，跳过 /api/、/_next/、/sw.js、静态资源
 *  - 通过 Response Header 把 visitorId/page/referer 透传给前端，
 *    前端在浏览器空闲时 fetch /api/visit 上报，不阻塞渲染
 *    （Edge Runtime 无法直接连 PostgreSQL，必须由前端转发）
 *  - 爬虫 UserAgent 直接跳过，避免污染统计
 *  - 不引入 next-auth，保持 Edge 兼容
 *
 * 注：visitorId 在此用 IP + UA 的 SHA-256 哈希生成（截断 16 字节 hex）。
 *     真实 IP 优先取 x-forwarded-for 首段。
 */

// ---------- 爬虫 UA 关键词（小写匹配） ----------
const BOT_KEYWORDS = ['bot', 'crawler', 'spider', 'slurp', 'baidu', 'bing', 'google', 'yandex', 'sogou', 'exabot', 'facebot', 'ia_archiver', 'facebookexternalhit', 'twitterbot', 'linkedinbot', 'semrush', 'ahrefs', 'mj12']

function isBot(ua: string): boolean {
  const lower = ua.toLowerCase()
  return BOT_KEYWORDS.some((k) => lower.includes(k))
}

// ---------- 简易 SHA-256（Edge Runtime 自带 crypto.subtle） ----------
async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  // 取前 16 字节 → 32 位 hex（足够区分访客，避免过长）
  const bytes = new Uint8Array(buf).slice(0, 16)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function getClientIP(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip') ?? 'unknown'
}

// ---------- 跳过的路径前缀 ----------
const SKIP_PREFIXES = ['/api/', '/_next/', '/@vite/', '/uploads/', '/image/', '/feed.xml', '/robots.txt', '/sitemap.xml', '/favicon.ico', '/sw.js', '/manifest.json']

// ---------- 生产环境禁止访问的测试页面 ----------
const TEST_PAGES = ['/test-captcha', '/test-sentry']

function shouldSkip(pathname: string): boolean {
  return SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))
}

function isTestPage(pathname: string): boolean {
  return TEST_PAGES.some((p) => pathname === p || pathname.startsWith(p))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 0) 生产环境禁止访问测试页面
  if (process.env.NODE_ENV === 'production' && isTestPage(pathname)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // 1) 跳过非页面请求
  if (shouldSkip(pathname)) {
    return NextResponse.next()
  }

  // 2) 跳过爬虫
  const ua = req.headers.get('user-agent') ?? ''
  if (!ua || isBot(ua)) {
    return NextResponse.next()
  }

  // 3) 生成 visitorId
  const ip = getClientIP(req)
  const visitorId = await sha256Hex(`${ip}::${ua}`)

  // 4) 取 referer（仅同源才有意义）
  const referer = req.headers.get('referer') ?? ''

  // 5) 把数据透传给前端：
  //    - Response Header 保留，便于需要时直接读取
  //    - Cookie 同时写入，前端可直接读取，避免一次 HEAD fetch 产生的 ERR_ABORTED
  const res = NextResponse.next()
  res.headers.set('x-visit-visitor', visitorId)
  res.headers.set('x-visit-page', pathname)
  // referer 可能含查询参数，限制长度避免 header 过大
  res.headers.set('x-visit-referer', referer.slice(0, 500))

  // 注意：res.cookies.set() 会自动编码，不要手动 encodeURIComponent，否则会双重编码
  const cookiePayload = JSON.stringify({
    visitorId,
    page: pathname,
    referer: referer.slice(0, 500),
  })
  res.cookies.set('__vitalog_visit', cookiePayload, {
    path: '/',
    maxAge: 300, // 5 分钟，足够客户端上报并避免长期携带
    sameSite: 'lax',
    secure: false, // localhost / http 环境
  })
  return res
}

export const config = {
  // 拦截所有路径，由 middleware 内部判断是否跳过
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
