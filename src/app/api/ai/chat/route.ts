import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { checkAndConsumeQuota, refundQuota } from "@/lib/ai/quota";
import { ragQueryStream } from "@/lib/ai/rag";
import { streamDeepSeek } from "@/lib/ai/embeddings";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

// ============================================================
// Schema：请求体约束（防滥用 + 防止空对象/巨包）
// ============================================================

// 单次提问上限 2000 字，约 1000 token，避免单请求把上游打爆
const MAX_QUESTION_LENGTH = 2000;

// 可选页面上下文：长度都做硬上限，避免有人塞一堆垃圾进来撑爆 SSE
const ContextSchema = z
  .object({
    pageType: z.string().max(50).optional(),
    pageTitle: z.string().max(200).optional(),
    pageUrl: z.string().max(500).optional(),
  })
  .optional();

const ChatRequestSchema = z
  .object({
    question: z.string().max(MAX_QUESTION_LENGTH, "问题过长（≤2000 字）").optional(),
    message: z.string().max(MAX_QUESTION_LENGTH).optional(),
    mode: z.enum(["rag", "chat"]).optional().default("rag"),
    context: ContextSchema,
  })
  .refine((v) => !!(v.question || v.message), {
    message: "请输入问题",
  });

/**
 * POST /api/ai/chat — RAG 流式聊天 (SSE)
 *
 * 修复要点：
 *  - 用新的 checkAndConsumeQuota 一次原子操作替代 check + consume 两个调用
 *  - AI 调用失败 / 客户端断开时 refundQuota 恢复一次额度
 *  - 匿名用户依然不消耗配额
 */
export const POST = withRateLimit(RATE_LIMITS.aiStream, async (request: NextRequest) => {
  // 用于标记本次请求是否最终成功，AbortSignal 触发时也能正确回滚
  let quotaConsumed = false;
  let userId: string | undefined;
  let consumedUserId: string | undefined; // 真正扣了配额的用户（匿名不扣）

  const rollback = async () => {
    if (quotaConsumed && consumedUserId) {
      await refundQuota(consumedUserId);
    }
  };

  try {
    const session = await auth();
    userId = session?.user?.id;

    // ---------- 配额检查 + 消耗（原子） ----------
    const quota = await checkAndConsumeQuota(userId);
    if (!quota.allowed) {
      return new Response(
        `data: ${JSON.stringify({ type: "error", content: `今日额度已用完（${quota.limit}次/天），请明天再试` })}\n\n`,
        { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } }
      );
    }
    if (userId) {
      // 登录用户才记录为"已扣"，匿名不扣
      quotaConsumed = true;
      consumedUserId = userId;
    }

    // ---------- 解析 + 校验请求 ----------
    const raw = await request.json().catch(() => ({}));
    const parsed = ChatRequestSchema.safeParse(raw);
    if (!parsed.success) {
      await rollback();
      const msg = parsed.error.issues[0]?.message || "请求参数不合法";
      return new Response(
        `data: ${JSON.stringify({ type: "error", content: msg })}\n\n`,
        { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
      );
    }
    const { mode, context } = parsed.data;
    const question: string = (parsed.data.question || parsed.data.message || "").trim();
    // 注：上面 schema 的 refine 已经保证 question/message 至少有一个存在，
    //      .trim() 后仍可能为空（纯空格），在这里兜一道
    if (!question) {
      await rollback();
      return new Response(
        `data: ${JSON.stringify({ type: "error", content: "请输入问题" })}\n\n`,
        { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
      );
    }

    // ---------- 创建 SSE 流 ----------
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let clientClosed = false;
        // 监听客户端断连：客户端 abort 触发时主动 close + 回滚配额
        const onAbort = () => {
          clientClosed = true;
          try { controller.close(); } catch { /* already closed */ }
        };
        request.signal.addEventListener("abort", onAbort);

        try {
          // 发送配额信息
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "quota", remaining: quota.remaining, limit: quota.limit })}\n\n`
            )
          );

          if (mode === "chat") {
            for await (const token of streamDeepSeek([
              { role: "system", content: "你是 TechBlog Labs 的 AI 助手，用中文友好地回答。" },
              { role: "user", content: question },
            ])) {
              if (clientClosed) break;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`)
              );
            }
          } else {
            for await (const chunk of ragQueryStream(question, context)) {
              if (clientClosed) break;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
              );
            }
          }

          if (!clientClosed) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
        } catch (err: any) {
          // AI 异常 → 回滚配额
          await rollback();
          if (!clientClosed) {
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", content: err.message || "出错了" })}\n\n`)
              );
            } catch { /* controller closed */ }
          }
        } finally {
          request.signal.removeEventListener("abort", onAbort);
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    // 顶层 catch（鉴权失败 / JSON 解析失败等）
    await rollback();
    console.error("[POST /api/ai/chat]", error);
    return new Response(
      `data: ${JSON.stringify({ type: "error", content: "服务异常" })}\n\n`,
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }
});
