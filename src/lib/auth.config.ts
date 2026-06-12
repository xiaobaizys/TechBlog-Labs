import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { isCaptchaRequired, consumeTicket, onPwdFail, onPwdSuccess } from '@/lib/captcha'

// ============================================================
// secret 解析：优先 AUTH_SECRET，回退 NEXTAUTH_SECRET
// 缺失时显式打印一次性警告（避免"Configuration"黑盒错误）
// ============================================================
const AUTH_SECRET =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  (() => {
    const msg = '[auth.config] AUTH_SECRET / NEXTAUTH_SECRET 未配置。' + '请在 .env.local 中设置：`AUTH_SECRET="$(openssl rand -base64 32)"`。' + "NextAuth v5 在缺失 secret 时会抛 'Configuration' 错误，导致登录报" + "'服务端认证配置异常，请联系管理员'。"
    if (process.env.NODE_ENV !== 'production') {
      console.error(msg)
    }
    return undefined
  })()

/**
 * NextAuth 基础配置
 *
 * 仅包含 providers，不含 adapter / database 相关配置
 * 这样可以在 Edge Runtime (middleware) 中安全导入。
 */
export default {
  // 显式指定 secret，middleware / edge 运行时也能拿到正确的密钥
  secret: AUTH_SECRET,
  // v5 在非 Vercel 环境必须显式信任 host
  trustHost: true,

  providers: [
    // ============================================================
    // GitHub OAuth（仅在环境变量配置后启用）
    // ============================================================
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
          }),
        ]
      : []),

    // ============================================================
    // 邮箱 + 密码 登录
    // ============================================================
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email', placeholder: 'your@email.com' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        // ---------- 1. 参数校验 ----------
        // 接受 { identifier, password, captchaTicket?, rememberMe? }，
        // 兼容老字段 email/username，避免 NextAuth v5 严格类型误报
        const creds = (credentials ?? {}) as Record<string, unknown>
        const identifier = (creds.identifier ?? creds.email ?? creds.username) as string | undefined
        const password = creds.password as string | undefined
        const captchaTicket = creds.captchaTicket as string | undefined
        // 记住我：仅当字符串严格为 "true" / boolean true 时才视为勾选
        const rememberMe = creds.rememberMe === true || creds.rememberMe === 'true'

        if (!identifier || !password) {
          throw new Error('请输入用户名/邮箱和密码')
        }

        // ---------- 2. 查找用户 ----------
        // 一个输入框同时支持邮箱/用户名：
        //   - 看起来像 email → 按 email 查
        //   - 否则 → 按 name 查（大小写不敏感）
        const trimmed = identifier.trim()
        const isEmail = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(trimmed)

        const user = isEmail
          ? await prisma.user.findUnique({ where: { email: trimmed } })
          : await prisma.user.findFirst({
              where: { name: { equals: trimmed, mode: 'insensitive' } },
            })

        // 用户不存在：仍然计入"密码错误"次数（防枚举攻击：统一错误信息）
        if (!user) {
          await onPwdFail(trimmed)
          throw new Error('用户名/邮箱或密码错误')
        }

        // ---------- 3. 账号是否设置了密码 ----------
        // GitHub 登录的用户没有 hashedPassword，必须走 OAuth
        if (!user.hashedPassword) {
          throw new Error('该账号使用 GitHub 登录，请通过 GitHub 登录')
        }

        // ---------- 4. 滑块验证 ----------
        // 触发条件：该 identifier 累计错误次数 ≥ 3（见 captcha/PWD_FAIL_THRESHOLD）
        const needCaptcha = await isCaptchaRequired(user.email ?? trimmed)
        if (needCaptcha) {
          if (!captchaTicket) {
            throw new Error('请先完成滑块验证')
          }
          // 一次性消费 ticket（已通过滑块 → 允许一次登录尝试）
          const ok = await consumeTicket(captchaTicket, '')
          if (!ok) {
            throw new Error('滑块验证已失效，请重新验证')
          }
        }

        // ---------- 5. 校验密码 ----------
        const isValid = await bcrypt.compare(password, user.hashedPassword)

        if (!isValid) {
          // 密码错误：累计次数，达到阈值会要求滑块
          await onPwdFail(user.email ?? trimmed)
          throw new Error('用户名/邮箱或密码错误')
        }

        // ---------- 6. 登录成功：重置失败次数 ----------
        await onPwdSuccess(user.email ?? trimmed)

        // ---------- 7. 返回用户 ----------
        // 把 rememberMe 透传到 jwt 回调，由 jwt 决定 token.exp
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          rememberMe,
        }
      },
    }),
  ],
} satisfies NextAuthConfig
