import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 当前用户信息（精简字段）
 */
export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: string;
  emailVerified: Date | null;
  createdAt: Date | null;
};

/**
 * 获取当前登录用户的完整信息（服务端）
 *
 * 用法（Server Component）:
 * ```tsx
 * const user = await currentUser();
 * if (!user) return <div>请先登录</div>;
 * return <div>你好, {user.name}</div>;
 * ```
 *
 * @returns 用户对象或 null
 */
export async function currentUser(): Promise<CurrentUser | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return user;
  } catch {
    // 数据库查询失败时，回退到 session 中的信息
    return {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      role: (session.user.role as string) ?? "USER",
      emailVerified: null,
      createdAt: null,
    };
  }
}

/**
 * 判断当前用户是否为管理员
 */
export async function isAdmin(): Promise<boolean> {
  const user = await currentUser();
  return user?.role === "ADMIN";
}
