// ============================================================
// NextAuth v5 类型扩展
// ------------------------------------------------------------
//  背景：auth.ts 里我们把 user.id / user.role 写进了 JWT，
//       session 回调里又把它们写进 session.user。
//       NextAuth v5 默认的 Session.user / JWT 类型里没有这些字段，
//       所以 TypeScript 在每个 `auth().user.id` 的地方都报错。
//
//  解决：用 module augmentation 给 Session / JWT 加上自定义字段。
//  这个文件会被 tsconfig.json include 进来（见 src/types/ 目录）。
//
//  重启：augmentation 改动后需要重启 `tsc` / `next dev` 才能生效。
// ============================================================

import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

/**
 * 用户角色：跟 Prisma 的 `User.role` enum 对齐（"USER" | "ADMIN"）
 */
export type UserRole = "USER" | "ADMIN";

declare module "next-auth" {
  /**
   * 扩展 Session.user：增加 id 和 role
   */
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  /**
   * 扩展 User（authorize 返回的形状）：增加 role
   *  - 字段保持 optional，避免影响 OAuth 提供商
   */
  interface User {
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  /**
   * 扩展 JWT：增加 id 和 role
   */
  interface JWT extends DefaultJWT {
    id?: string;
    role?: UserRole;
  }
}
