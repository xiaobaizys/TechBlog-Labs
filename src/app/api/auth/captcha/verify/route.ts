import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { verifySlider, deleteChallenge } from "@/lib/captcha";

/**
 * POST /api/auth/captcha/verify
 *
 * 校验滑块位置，签发一次性 ticket。
 *
 * 请求体：
 *  - challengeId: string
 *  - finalX: number          滑块最终 X 坐标
 *  - finalY?: number         滑块最终 Y 坐标（可选，默认 0）
 *  - track: Array<{x, y, t}> 拖拽轨迹
 *
 * 响应（成功）：
 *  - ticket: string          用于登录接口
 *  - expiresIn: number       ticket 有效期（秒）
 *
 * 响应（失败）：
 *  - reason: 'expired' | 'mismatch' | 'behavior' | 'rate-limit' | 'missing'
 */
const VerifySchema = z.object({
  challengeId: z.string().min(16).max(128),
  finalX: z.number().finite(),
  finalY: z.number().finite().optional(),
  track: z
    .array(
      z.object({
        x: z.number().finite(),
        y: z.number().finite(),
        t: z.number().int().nonnegative(),
      })
    )
    .min(1)
    .max(500),
});

export const POST = withRateLimit(
  { namespace: "captcha-verify", limit: 30, windowSec: 60 },
  async (req: NextRequest) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, reason: "missing" },
        { status: 400 }
      );
    }

    const parsed = VerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, reason: "missing" },
        { status: 400 }
      );
    }

    const result = await verifySlider(parsed.data);

    if (!result.success) {
      // 行为异常或超限 → 立即销毁挑战，防止暴力枚举
      if (result.reason === "rate-limit" || result.reason === "behavior") {
        await deleteChallenge(parsed.data.challengeId);
      }
      return NextResponse.json(
        { success: false, reason: result.reason },
        { status: 200 } // 用 200，由 success 字段控制
      );
    }

    return NextResponse.json({
      success: true,
      data: { ticket: result.ticket, expiresIn: result.expiresIn },
    });
  }
);
