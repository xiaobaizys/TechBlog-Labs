import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkAndConsumeQuota, refundQuota } from "@/lib/ai/quota";
import { callDeepSeek } from "@/lib/ai/embeddings";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getAICache, setAICache } from "@/lib/ai/cache";

/**
 * POST /api/ai/tools/generate-tags — AI 生成文章标签
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

    // 1. 查缓存
    const cacheInput = content.slice(0, 4000);
    const cached = await getAICache<{ tags: string[] }>("generate-tags", cacheInput);
    if (cached) {
      return NextResponse.json({
        success: true,
        data: cached.tags,
        remaining: 0,
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
    let tagsText: string;
    try {
      tagsText = await callDeepSeek(
        [
          {
            role: "system",
            content: "你是文章标签生成器。根据文章内容生成3-8个标签。只返回标签数组JSON格式，不要其他内容。示例: [\"React\",\"TypeScript\",\"前端开发\"]",
          },
          {
            role: "user",
            content: `为以下文章生成标签:\n\n${cacheInput}`,
          },
        ],
        { temperature: 0.3, max_tokens: 200 }
      );
    } catch (aiErr) {
      await rollback();
      throw aiErr;
    }

    // 解析返回的 JSON 数组
    let tags: string[] = [];
    try {
      const match = tagsText.match(/\[[\s\S]*?\]/);
      if (match) tags = JSON.parse(match[0]);
    } catch {
      tags = tagsText.split(/[,，]/).map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    }
    tags = tags.slice(0, 8);

    // 4. 写缓存
    setAICache("generate-tags", cacheInput, { tags }).catch(() => {});

    return NextResponse.json({ success: true, data: tags, remaining: quota.remaining });
  } catch (error: any) {
    await rollback();
    console.error("[POST /api/ai/tools/generate-tags]", error);
    return NextResponse.json({ success: false, message: error.message || "生成失败" }, { status: 500 });
  }
});
