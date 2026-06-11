import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

// ============================================================
// 校验 Schema
// ============================================================
const RegisterSchema = z.object({
  email: z
    .string({ required_error: "邮箱不能为空" })
    .email("邮箱格式不正确")
    .min(1, "邮箱不能为空"),
  name: z
    .string({ required_error: "昵称不能为空" })
    .min(1, "昵称不能为空")
    .max(50, "昵称最长 50 个字符"),
  password: z
    .string({ required_error: "密码不能为空" })
    .min(6, "密码至少 6 个字符")
    .max(100, "密码最长 100 个字符"),
});

// ============================================================
// POST — 注册新用户
// ============================================================
export const POST = withRateLimit(RATE_LIMITS.auth, async (request: NextRequest) => {
  try {
    // ---------- 1. 解析并校验请求体 ----------
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, message: "请求体不能为空" },
        { status: 400 }
      );
    }

    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { success: false, message: firstError.message },
        { status: 400 }
      );
    }

    const { email, name, password } = parsed.data;

    // ---------- 2. 检查邮箱是否已存在 ----------
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "该邮箱已被注册" },
        { status: 409 }
      );
    }

    // ---------- 3. 加密密码 ----------
    const SALT_ROUNDS = 10;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // ---------- 4. 创建用户 ----------
    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
        role: "USER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // ---------- 5. 返回成功 ----------
    return NextResponse.json(
      {
        success: true,
        message: "注册成功，请登录",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER ERROR]", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
});
