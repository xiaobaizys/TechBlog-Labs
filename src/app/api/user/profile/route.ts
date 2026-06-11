import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/user/profile — 更新当前登录用户的昵称 / 邮箱
 *
 * 请求体（JSON）:
 *   { name: string, email: string | null }
 *
 * 校验规则:
 *   - name: 必填，trim 后 1 ~ 32 字符
 *   - email: 选填；如提供则必须符合邮箱格式，且不能与他人重复
 *   - 当前密码（如要改邮箱）: 不在本接口做（生产应发验证邮件，这里只做"轻量编辑"）
 *
 * 成功返回: { success: true, data: { id, name, email } }
 *
 * 失败状态码:
 *   401 未登录
 *   400 字段不合法
 *   409 邮箱已被占用
 *   500 其它
 */
const NAME_MIN = 1;
const NAME_MAX = 32;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const rawName: unknown = body?.name;
    const rawEmail: unknown = body?.email;

    /* ---------- 校验 name ---------- */
    if (typeof rawName !== "string") {
      return NextResponse.json(
        { success: false, message: "昵称不合法" },
        { status: 400 }
      );
    }
    const name = rawName.trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      return NextResponse.json(
        { success: false, message: `昵称长度需在 ${NAME_MIN}-${NAME_MAX} 字符之间` },
        { status: 400 }
      );
    }

    /* ---------- 校验 email ---------- */
    let email: string | null;
    if (rawEmail === null || rawEmail === "" || rawEmail === undefined) {
      email = null;
    } else if (typeof rawEmail !== "string" || !EMAIL_RE.test(rawEmail.trim())) {
      return NextResponse.json(
        { success: false, message: "邮箱格式不合法" },
        { status: 400 }
      );
    } else {
      email = rawEmail.trim().toLowerCase();
    }

    /* ---------- 检查邮箱唯一性 ---------- */
    if (email) {
      const exist = await prisma.user.findFirst({
        where: { email, NOT: { id: session.user.id } },
        select: { id: true },
      });
      if (exist) {
        return NextResponse.json(
          { success: false, message: "该邮箱已被其他账号使用" },
          { status: 409 }
        );
      }
    }

    /* ---------- 写入数据库 ---------- */
    // 如果邮箱发生变更，强制把 emailVerified 清空（需要重新验证）
    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    const emailChanged =
      (current?.email ?? null) !== email && email !== null;
    const data: { name: string; email: string | null; emailVerified?: null } = {
      name,
      email,
    };
    if (emailChanged) data.emailVerified = null;

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, email: true, image: true, role: true },
    });

    return NextResponse.json({
      success: true,
      message: "资料已更新",
      data: updated,
    });
  } catch (error) {
    console.error("[PUT /api/user/profile]", error);
    return NextResponse.json(
      { success: false, message: "更新失败" },
      { status: 500 }
    );
  }
}
