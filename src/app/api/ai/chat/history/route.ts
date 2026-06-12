import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/* ============================================================
 * Schema
 * ============================================================ */

const SaveMessageSchema = z.object({
  sessionId: z.string().optional(),
  userMessage: z.string().min(1).max(5000),
  assistantContent: z.string().min(1).max(50000),
  sources: z
    .array(z.object({ title: z.string(), slug: z.string() }))
    .optional(),
});

/* ============================================================
 * GET — 列出当前用户的会话列表
 * ============================================================ */
export const GET = async () => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ success: false, error: "未登录" }, { status: 401 });
    }
    const userId = session.user.id;

    const sessions = await prisma.aIChatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
      },
    });

    const list = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      lastMessage: s.messages[0]
        ? {
            content: s.messages[0].content.slice(0, 80),
            role: s.messages[0].role,
            createdAt: s.messages[0].createdAt,
          }
        : null,
      messageCount: 0, // 下面补
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    // 补 messageCount（Prisma 不支持直接 count 在 include 里）
    const counts = await Promise.all(
      sessions.map((s) =>
        prisma.aIChatMessage.count({ where: { sessionId: s.id } })
      )
    );
    list.forEach((item, i) => (item.messageCount = counts[i]));

    return Response.json({ success: true, data: list });
  } catch (error) {
    console.error("[GET /api/ai/chat/history]", error);
    return Response.json({ success: false, error: "服务异常" }, { status: 500 });
  }
};

/* ============================================================
 * POST — 保存一轮对话（user msg + assistant response）
 * ============================================================ */
export const POST = async (request: NextRequest) => {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return Response.json({ success: false, error: "未登录" }, { status: 401 });
    }
    const userId = authSession.user.id;

    const raw = await request.json().catch(() => ({}));
    const parsed = SaveMessageSchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0]?.message || "参数错误" },
        { status: 400 }
      );
    }

    const { sessionId, userMessage, assistantContent, sources } = parsed.data;

    // 查找或创建 session
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      // 新 session：title 取用户消息前 30 字
      const title = userMessage.slice(0, 30) + (userMessage.length > 30 ? "…" : "");
      const newSession = await prisma.aIChatSession.create({
        data: { userId, title },
      });
      targetSessionId = newSession.id;
    } else {
      // 验证 session 归属
      const existing = await prisma.aIChatSession.findFirst({
        where: { id: targetSessionId, userId },
      });
      if (!existing) {
        return Response.json({ success: false, error: "会话不存在" }, { status: 404 });
      }
    }

    // 批量写入两条消息
    await prisma.aIChatMessage.createMany({
      data: [
        {
          sessionId: targetSessionId,
          role: "user",
          content: userMessage,
        },
        {
          sessionId: targetSessionId,
          role: "assistant",
          content: assistantContent,
          sources: sources ? JSON.stringify(sources) : null,
        },
      ],
    });

    // 更新 session 的 updatedAt
    await prisma.aIChatSession.update({
      where: { id: targetSessionId },
      data: {},
    });

    return Response.json({ success: true, data: { sessionId: targetSessionId } });
  } catch (error) {
    console.error("[POST /api/ai/chat/history]", error);
    return Response.json({ success: false, error: "服务异常" }, { status: 500 });
  }
};