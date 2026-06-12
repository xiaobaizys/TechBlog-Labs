import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  generateChallenge,
  newChallengeId,
  saveChallenge,
  svgToDataUrl,
} from "@/lib/captcha";

/**
 * POST /api/auth/captcha/challenge
 *
 * 生成一道新的滑块挑战。
 *
 * 响应：
 *  - challengeId        用于回传
 *  - backgroundDataUrl  背景图（SVG, dataURL）
 *  - sliderDataUrl      滑块块图（SVG, dataURL）
 *  - targetX/targetY    缺口在背景图中的位置（中心点，px）
 *  - pieceSize          拼图块边长（px）
 *  - bgWidth/bgHeight   背景图尺寸
 *  - expiresAt          过期时间（Unix 毫秒）
 *
 * 安全：
 *  - 限流：10 req/min/IP（防脚本刷挑战）
 *  - challengeId 256 bit 随机（防枚举）
 *  - targetX/Y 写入 Redis 校验用，签名防篡改
 */
export const POST = withRateLimit(
  { namespace: "captcha-gen", limit: 10, windowSec: 60 },
  async (_req: NextRequest) => {
    const bgWidth = 320;
    const bgHeight = 180;
    const { backgroundSvg, sliderSvg, piece } = generateChallenge(bgWidth, bgHeight);
    const challengeId = newChallengeId();

    await saveChallenge(challengeId, {
      targetX: piece.x,
      targetY: piece.y,
      pieceSize: piece.size,
      bgWidth,
      bgHeight,
      pathD: piece.pathD,
    });

    return NextResponse.json({
      success: true,
      data: {
        challengeId,
        backgroundDataUrl: svgToDataUrl(backgroundSvg),
        sliderDataUrl: svgToDataUrl(sliderSvg),
        targetX: piece.x,
        targetY: piece.y,
        pieceSize: piece.size,
        bgWidth,
        bgHeight,
        expiresAt: Date.now() + 3 * 60 * 1000,
      },
    });
  }
);
