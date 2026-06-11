import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkAndConsumeQuota, refundQuota } from "@/lib/ai/quota";
import { callDeepSeek } from "@/lib/ai/embeddings";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getAICache, setAICache } from "@/lib/ai/cache";

/**
 * POST /api/ai/tools/summarize — AI 生成文章摘要
 *
 * 流程：限流 → 缓存查询 → 配额检查+消耗(原子) → 调 AI → 写缓存
 * 失败/异常：refundQuota 回滚一次额度
 */
export const POST = withRateLimit(RATE_LIMITS.ai, async (request: NextRequest) => {
  let consumed = false;
  let consumedUserId: string | undefined;
  const rollback = async () => {
    if (consumed && consumedUserId) await refundQuota(consumedUserId);
  };

  try {
    const session = await auth();
    const userId = session?.user?.id;

    const body = await request.json().catch(() => ({}));
    const content: string = body.content?.trim();
    if (!content) {
      return NextResponse.json({ success: false, message: "内容不能为空" }, { status: 400 });
    }

    // 1. 查缓存（按文本前 8000 字做 hash，相同内容直接返回）
    const cacheInput = content.slice(0, 8000);
    const cached = await getAICache<{ summary: string }>("summarize", cacheInput);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached.summary,
        remaining: 0, // 缓存命中不消耗配额
        cached: true,
      });
    }

    // 2. 配额检查 + 消耗（原子）
    const quota = await checkAndConsumeQuota(userId);
    if (!quota.allowed) {
      return NextResponse.json({ success: false, message: "今日额度已用完" }, { status: 429 });
    }
    if (userId) {
      consumed = true;
      consumedUserId = userId;
    }

    // 3. 调 AI
    let summary: string;
    try {
      summary = await callDeepSeek(
        [
          {
            role: "system",
            content: "你是文章摘要生成器。根据文章内容生成100-200字的中文摘要。只返回摘要文本，不要加前缀。",
          },
          {
            role: "user",
            content: `为以下文章生成摘要:\n\n${cacheInput}`,
          },
        ],
        { temperature: 0.5, max_tokens: 400 }
      );
    } catch (aiErr) {
      // AI 失败 → 回滚配额
      await rollback();
      throw aiErr;
    }

    // 4. 写缓存（24h）
    const trimmed = summary.trim();
    setAICache("summarize", cacheInput, { summary: trimmed }).catch(() => {});

    return NextResponse.json({ success: true, data: trimmed, remaining: quota.remaining });
  } catch (error: any) {
    await rollback();
    console.error("[POST /api/ai/tools/summarize]", error);
    return NextResponse.json({ success: false, message: error.message || "生成失败" }, { status: 500 });
  }
});
