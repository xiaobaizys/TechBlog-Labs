import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import crypto from "crypto";

/**
 * POST /api/auth/forgot-password
 *
 * 忘记密码 — 发送密码重置邮件
 *
 * 安全设计：
 *  - 无论邮箱是否存在，统一返回成功（防账号枚举）
 *  - 限流防滥用
 *  - 生成一次性 token 存入 DB，有效期 1 小时
 *
 * TODO: 接入真实邮件服务（如 Resend / SendGrid / SMTP）后，
 *       在下方 `sendResetEmail` 函数中实现邮件发送逻辑。
 *       当前 token 已生成并存入数据库，管理员可通过 DB 手动协助重置。
 */

async function sendResetEmail(_email: string, _token: string, _baseUrl: string) {
  // ============================================================
  // 占位：接入邮件服务后实现
  //
  // 示例（Resend）：
  //   await resend.emails.send({
  //     from: "noreply@yourdomain.com",
  //     to: email,
  //     subject: "重置你的 VitaLog 密码",
  //     html: `<p>点击下方链接重置密码：</p>
  //            <a href="${baseUrl}/reset-password?token=${token}">重置密码</a>
  //            <p>链接 1 小时内有效。</p>`,
  //   });
  // ============================================================
  console.log("[forgot-password] 重置 token 已生成:", {
    email: _email,
    token: _token.slice(0, 8) + "…",
    resetUrl: `${_baseUrl}/reset-password?token=${_token}`,
  });
}

export const POST = withRateLimit(RATE_LIMITS.auth, async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => null);
    const email = (body?.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "请输入邮箱" },
        { status: 400 }
      );
    }

    // 查找用户（不透露是否存在）
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user?.email) {
      // 生成一次性重置 token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 小时

      // 存储到 SystemConfig（用 key 前缀 `reset_token:{token}` → value = userId）
      await prisma.systemConfig.create({
        data: {
          key: `reset_token:${token}`,
          value: JSON.stringify({ userId: user.id, email: user.email, expires: expires.toISOString() }),
        },
      });

      // 发送邮件
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      await sendResetEmail(user.email, token, baseUrl);
    }

    // 统一返回成功（防枚举）
    return NextResponse.json({
      success: true,
      message: "如果该邮箱已注册，你将收到一封密码重置邮件",
    });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
});
