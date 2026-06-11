import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cache } from "react";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import authConfig from "./auth.config";

const nextAuth = NextAuth({
  // ============================================================
  // 先合并 base config（providers）
  // ============================================================
  ...authConfig,

  // ============================================================
  // 显式指定 secret（v5 必填，优先读 AUTH_SECRET，再回退 NEXTAUTH_SECRET）
  // ============================================================
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  // ============================================================
  // v5 在非 Vercel 环境必须显式信任 host，否则 Cookie 写入会被拒绝
  // ============================================================
  trustHost: true,

  // ============================================================
  // 数据库适配器
  // ============================================================
  adapter: PrismaAdapter(prisma),

  // ============================================================
  // Session 策略
  // ============================================================
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },

  // ============================================================
  // 页面路径
  // ============================================================
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // ============================================================
  // 回调
  // ============================================================
  callbacks: {
    /**
     * JWT 回调：
     * - 首次登录时: 将 user.id / user.role 写入 token
     * - update 触发时: 从数据库刷新最新用户信息
     */
    async jwt({ token, user, trigger }) {
      // 首次登录
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
        // 仅 dev 打印：上线后避免泄露 token 内容
        if (process.env.NODE_ENV !== "production") {
          console.log("[auth/jwt] 首次登录写入 token:", {
            id: token.id,
            role: token.role,
          });
        }
      }

      // 当客户端调用 update() 时，刷新数据库中的信息
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, email: true, image: true, role: true },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.image;
          token.role = dbUser.role;
        }
      }

      return token;
    },

    /**
     * Session 回调：将 token 信息暴露给客户端 session
     *
     * 注意：一旦自定义了 session 回调，NextAuth 的默认映射就失效了，
     *      必须手动把 token.picture → session.user.image 复制过去，
     *      否则头像永远拿不到。
     *
     * 自愈：JWT cookie 在上传头像时如果没被 update() 刷新，token.picture
     *      会是 null。这里发现 token.picture 缺失时，直接从 DB 补一次，
     *      保证用户永远看到最新的头像。
     */
    async session({ session, token }) {
      if (!session.user) return session;
      if (!token.id) {
        console.warn("[auth/session] token.id 缺失，可能 JWT 未正确签发/解码");
        return session;
      }

      session.user.id = token.id as string;
      session.user.role = (token.role as string) ?? "USER";

      // 1) 先按 token 里的字段填（最快路径，正常情况走这里）
      //    Session.user.email 在 NextAuth v5 类型里被推断为 `string`（非空），
      //    与 next-auth.d.ts 的 `email?: string | null` augmentation 冲突。
      //    用本地显式类型 + `?? null` 兜底，确保赋值兼容。
      type MutableUser = {
        name: string | null;
        email: string | null;
        image: string | null;
        role: "USER" | "ADMIN";
        id: string;
      };
      const sUser = session.user as unknown as MutableUser;
      if (token.name !== undefined) sUser.name = (token.name as string | null) ?? null;
      if (token.email !== undefined) sUser.email = (token.email as string | null) ?? null;
      if (token.picture) sUser.image = token.picture as string;

      // 2) 自愈：token.picture 缺失时，从 DB 补（头像/资料更新的兜底）
      if (!session.user.image) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { image: true, name: true, email: true, role: true },
          });
          if (dbUser) {
            sUser.image = dbUser.image ?? null;
            if (!sUser.name) sUser.name = dbUser.name;
            if (!sUser.email) sUser.email = dbUser.email;
            if (dbUser.role) sUser.role = dbUser.role;
          }
        } catch {
          /* DB 抖动不影响主流程 */
        }
      }

      return session;
    },
  },

  // ============================================================
  // 事件
  // ============================================================
  events: {
    /**
     * OAuth 账户关联成功后，标记邮箱已验证
     */
    async linkAccount({ user }) {
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }
    },
  },
});

/* ============================================================
 * 性能优化：用 React.cache 包装 auth()
 *   同一个请求周期内多次调用 auth()（如 layout + 多个 page 同时读 session）
 *   只触发一次 NextAuth 内部 session 回调 + JWT 解码，避免重复 DB hit。
 *   React.cache 自带 per-request 生命周期，请求结束自动清空。
 *
 *  关键：nextAuth.auth 在 v5 是多 overload 的（NextApiRequest / GetServerSidePropsContext / NextAuthRequest ...），
 *        直接 `cache(nextAuth.auth)` 会把全部 overload 都带回来，
 *        TypeScript 在 `auth().user` 时不知道挑哪个签名，错误地报 user 不存在。
 *  解法：用显式类型的 async 包装函数锁定签名 `() => Promise<Session | null>`。
 * ============================================================ */
const authImpl = async (): Promise<Session | null> => {
  return await nextAuth.auth();
};
export const auth = cache(authImpl);

export const { handlers, signIn, signOut } = nextAuth;
