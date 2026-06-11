import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * NextAuth 基础配置
 *
 * 仅包含 providers，不含 adapter / database 相关配置
 * 这样可以在 Edge Runtime (middleware) 中安全导入。
 */
export default {
  // 显式指定 secret，middleware / edge 运行时也能拿到正确的密钥
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email", placeholder: "your@email.com" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        // ---------- 1. 参数校验 ----------
        // credentials 实际可能带 email / identifier / username 等多种键，
        // 放宽类型到 Record<string, unknown> 避免 NextAuth v5 严格类型误报
        const creds = (credentials ?? {}) as Record<string, unknown>;
        const identifier = (creds.email ?? creds.identifier ?? creds.username) as
          | string
          | undefined;
        const password = creds.password as string | undefined;

        if (!identifier || !password) {
          throw new Error("邮箱/用户名和密码不能为空");
        }

        // ---------- 2. 查找用户 ----------
        // 支持两种方式登录：
        //   - 邮箱登录：identifier 是合法 email 格式
        //   - 用户名登录：identifier 是用户名（如 Admin）
        // 策略：先按 email 查；若不是 email 格式，再按 name 查（case-insensitive）
        const trimmed = identifier.trim();
        const isEmail = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(trimmed);

        const user = isEmail
          ? await prisma.user.findUnique({ where: { email: trimmed } })
          : await prisma.user.findFirst({
              where: { name: { equals: trimmed, mode: "insensitive" } },
            });

        if (!user) {
          throw new Error("邮箱或密码错误");
        }

        // ---------- 3. 检查密码 ----------
        if (!user.hashedPassword) {
          throw new Error(
            "该账号使用 GitHub 登录，请通过 GitHub 登录"
          );
        }

        const isValid = await bcrypt.compare(password, user.hashedPassword);

        if (!isValid) {
          throw new Error("邮箱或密码错误");
        }

        // ---------- 4. 返回用户 ----------
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
} satisfies NextAuthConfig;
