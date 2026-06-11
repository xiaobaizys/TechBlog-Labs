import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** 用户数据库 ID */
      id: string;
      /** 用户角色 */
      role: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    /** 用户角色 */
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** 用户 ID */
    id?: string;
    /** 用户角色 */
    role?: string;
  }
}
