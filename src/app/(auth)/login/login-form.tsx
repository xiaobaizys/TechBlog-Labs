'use client'

import { useState, useRef, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from '@/lib/toast'
import { SliderCaptcha } from '@/components/auth/SliderCaptcha'

/**
 * 登录表单（简化版）
 *
 * 核心逻辑：
 *  - 一个输入框同时支持「用户名」和「邮箱」（后端自动识别）
 *  - 密码框 + 登录按钮
 *  - 失败 3 次后自动弹出滑块验证
 *  - 通过验证后调用 NextAuth signIn 完成登录
 *  - 成功 → router.push(callbackUrl)
 *  - 失败 → 显示错误，错误次数 +1
 */
export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'

  // ============================================================
  // 状态
  // ============================================================
  const [identifier, setIdentifier] = useState('') // 用户名 / 邮箱
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true) // 记住我（默认勾选，保持 30 天登录态）
  const [submitting, setSubmitting] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)
  const [error, setError] = useState('')
  const [failCount, setFailCount] = useState(0) // 失败次数（用于 UI 提示）
  const [captchaOpen, setCaptchaOpen] = useState(false)
  const [captchaTicket, setCaptchaTicket] = useState<string | null>(null)

  // 暂存凭据，等滑块通过后再真正登录
  const pendingCredsRef = useRef<{ identifier: string; password: string } | null>(null)

  // ============================================================
  // 表单校验
  // ============================================================
  const isFormValid = identifier.trim().length >= 1 && password.length >= 1

  // ============================================================
  // 真正的登录（不弹滑块）
  // ============================================================
  const doSignIn = useCallback(
    async (id: string, pwd: string, ticket: string | null) => {
      setSubmitting(true)
      setError('')

      try {
        // redirect: false 时不会自动跳页，我们根据返回结果决定
        const result = await signIn('credentials', {
          identifier: id,
          password: pwd,
          captchaTicket: ticket ?? undefined,
          rememberMe: rememberMe ? 'true' : 'false',
          redirect: false,
        })

        if (!result) {
          setError('登录失败，请稍后重试')
          return
        }

        if (result.error) {
          // 解码错误信息（authorize() 抛出的 Error.message）
          const msg = decodeAuthError(result.error)
          setError(msg)
          setFailCount((c) => c + 1)
          return
        }

        // 登录成功：清空失败计数，跳转首页
        setFailCount(0)
        setCaptchaTicket(null)
        toast.success('登录成功')
        router.push(callbackUrl)
        router.refresh()
      } catch (e) {
        // 网络错误等情况
        setError(e instanceof Error ? e.message : '登录失败，请重试')
        setFailCount((c) => c + 1)
      } finally {
        setSubmitting(false)
      }
    },
    [callbackUrl, router, rememberMe],
  )

  // 滑块通过：拿到 ticket → 自动登录
  const handleCaptchaSuccess = useCallback(
    (ticket: string) => {
      setCaptchaOpen(false)
      setCaptchaTicket(ticket)
      const creds = pendingCredsRef.current
      if (creds) {
        pendingCredsRef.current = null
        void doSignIn(creds.identifier, creds.password, ticket)
      }
    },
    [doSignIn],
  )

  // 滑块取消
  const handleCaptchaCancel = useCallback(() => {
    setCaptchaOpen(false)
    pendingCredsRef.current = null
    setSubmitting(false)
  }, [])

  // GitHub 登录（OAuth）
  const handleGithubLogin = useCallback(async () => {
    setGithubLoading(true)
    setError('')
    try {
      // GitHub 走完整重定向流程，不需要我们处理结果
      // callbackUrl 透传，OAuth 完成后 NextAuth 会跳回
      await signIn('github', { callbackUrl })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'GitHub 登录失败，请重试')
      setGithubLoading(false)
    }
    // 注意：成功后页面会跳走，不需要重置 githubLoading
  }, [callbackUrl])

  // ============================================================
  // 提交
  // ============================================================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isFormValid || submitting) return

    const trimmedId = identifier.trim()

    // 已通过滑块：直接登录
    if (captchaTicket) {
      await doSignIn(trimmedId, password, captchaTicket)
      return
    }

    // 失败 ≥ 3 次：先弹滑块，暂存凭据
    if (failCount >= 3) {
      pendingCredsRef.current = { identifier: trimmedId, password }
      setCaptchaOpen(true)
      return
    }

    // 普通登录
    await doSignIn(trimmedId, password, null)
  }

  // ============================================================
  // JSX
  // ============================================================
  return (
    <div className="relative flex w-full items-center justify-center px-4 py-6">
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-amber/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-amber-bright/10 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
        <div className="theme-card p-8 md:p-10">
          {/* 标题 */}
          <div className="mb-8 text-center">
            <p className="mb-3 flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-amber-bright/80">
              <span className="inline-block h-px w-8 bg-amber-bright/60" />
              Sign in
              <span className="inline-block h-px w-8 bg-amber-bright/60" />
            </p>
            <h1 className="font-serif text-3xl font-medium tracking-tight">欢迎回来</h1>
            <p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">登录你的 VitaLog 账号</p>
          </div>

          {/* 错误提示 */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} role="alert" className="mb-6 rounded-lg border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
              {failCount >= 2 && failCount < 3 && <p className="mt-1.5 text-xs text-red-600/80 dark:text-red-400/80">再输错 {3 - failCount} 次将需要滑块验证</p>}
            </motion.div>
          )}

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* 用户名 / 邮箱 */}
            <div>
              <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium">
                用户名 / 邮箱
              </label>
              <div className="relative flex items-center rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] transition-all focus-within:border-amber focus-within:ring-2 focus-within:ring-amber/20">
                <span className="pl-3 text-[rgb(var(--muted-foreground))]">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="请输入用户名或邮箱"
                  className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[rgb(var(--muted-foreground))]"
                />
              </div>
            </div>

            {/* 密码 */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium">
                  密码
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-amber-bright underline-offset-2 hover:text-amber hover:underline">
                  忘记密码？
                </Link>
              </div>
              <div className="relative flex items-center rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] transition-all focus-within:border-amber focus-within:ring-2 focus-within:ring-amber/20">
                <span className="pl-3 text-[rgb(var(--muted-foreground))]">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[rgb(var(--muted-foreground))]"
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? '隐藏密码' : '显示密码'} className="pr-3 text-[rgb(var(--muted-foreground))] transition-colors hover:text-amber">
                  {showPassword ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 记住我 */}
            <label className="mt-1 flex cursor-pointer select-none items-center gap-2 text-sm text-[rgb(var(--muted-foreground))]">
              <span className="relative inline-flex">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="peer sr-only" />
                <span className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${rememberMe ? 'border-amber bg-amber text-white' : 'border-[rgb(var(--border))] bg-[rgb(var(--card))]'}`}>
                  {rememberMe && (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              </span>
              <span className="hover:text-foreground">记住我（30 天免登录）</span>
            </label>

            {/* 提示：失败 3 次后会触发滑块 */}
            {failCount >= 3 && !captchaOpen && <p className="rounded-md bg-amber/10 px-3 py-2 text-xs text-amber-bright">已连续输错 {failCount} 次，下次登录需要完成滑块验证</p>}

            {/* 提交按钮 */}
            <button type="submit" disabled={submitting || !isFormValid} className="btn-shimmer mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  登录中...
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  登录
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* 分隔线 + GitHub 登录 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-[rgb(var(--border))]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[rgb(var(--card))] px-3 text-xs uppercase tracking-wider text-[rgb(var(--muted-foreground))]">或使用以下方式登录</span>
            </div>
          </div>

          {/* GitHub 登录按钮 */}
          <button
            type="button"
            onClick={handleGithubLogin}
            disabled={githubLoading || submitting}
            className="group flex w-full items-center justify-center gap-2.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm font-medium transition-all hover:border-amber/60 hover:bg-amber/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {githubLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>跳转 GitHub 中...</span>
              </>
            ) : (
              <>
                {/* GitHub 官方 Logo（简化版） */}
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                <span>使用 GitHub 登录</span>
              </>
            )}
          </button>

          {/* 注册链接 */}
          <p className="mt-6 text-center text-sm text-[rgb(var(--muted-foreground))]">
            还没有账号？{' '}
            <Link href="/register" className="font-medium text-amber-bright underline-offset-2 hover:text-amber hover:underline">
              立即注册
            </Link>
          </p>
        </div>

        {/* 底部小字 */}
        <p className="mt-6 text-center text-xs text-[rgb(var(--muted-foreground))]">
          登录即表示你同意我们的
          <Link href="/terms" className="mx-1 underline underline-offset-2 hover:text-amber-bright">
            服务条款
          </Link>
          和
          <Link href="/privacy" className="mx-1 underline underline-offset-2 hover:text-amber-bright">
            隐私政策
          </Link>
        </p>
      </motion.div>

      {/* 滑块验证：失败 3 次后弹出 */}
      <SliderCaptcha open={captchaOpen} onSuccess={handleCaptchaSuccess} onCancel={handleCaptchaCancel} mock={process.env.NODE_ENV !== 'production'} />
    </div>
  )
}

/* ============================================================
 * 错误信息解码
 *
 * NextAuth v5 在 redirect:false 模式下，result.error 是 authorize() 抛出的
 * Error.message 字符串，可能是中文消息也可能是错误码。这里把常见错误码映射为
 * 中文，未知则原样显示。
 * ============================================================ */
function decodeAuthError(raw: string): string {
  let s = raw
  try {
    s = decodeURIComponent(raw)
  } catch {
    /* ignore */
  }
  s = s.trim()

  // 已经是中文 → 直接展示
  if (/[\u4e00-\u9fa5]/.test(s)) return s

  // 剥出 callback 错误里的原始 type
  const cbMatch = s.match(/CallbackRouteError[_\s]+(\w+)/)
  const base = cbMatch ? cbMatch[1] : s

  switch (base) {
    case 'CredentialsSignin':
      return '用户名/邮箱或密码错误'
    case 'Configuration':
      return '服务端认证配置异常，请联系管理员'
    case 'AccessDenied':
      return '没有访问权限'
    case 'Verification':
      return '验证链接已失效'
    case 'OAuthAccountNotLinked':
      return '该邮箱已绑定其他登录方式'
    case 'SessionRequired':
      return '请先登录'
    default:
      return `登录失败：${s}`
  }
}
