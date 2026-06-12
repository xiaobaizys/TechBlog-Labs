import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getPwdFailStatus } from "@/lib/captcha";

/**
 * GET /api/auth/captcha/status?identifier=xxx
 *
 * 查询某 identifier（email/username）当前是否需要滑块。
 *
 * 用于：登录页打开时，预检错误次数；如已 ≥ 阈值则主动弹滑块。
 *
 * 注意：
 *  - identifier 在 URL query 中，不写日志（避免泄露邮箱）
 *  - 接口限流防止被用来探测某邮箱是否在本系统
 */
export const GET = withRateLimit(
  { namespace: "captcha-status", limit: 30, windowSec: 60 },
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const identifier = (searchParams.get("identifier") ?? "").trim();
    if (!identifier) {
      return NextResponse.json(
        { success: false, message: "identifier 必填" },
        { status: 400 }
      );
    }
    const status = await getPwdFailStatus(identifier);
    return NextResponse.json({ success: true, data: status });
  }
);
