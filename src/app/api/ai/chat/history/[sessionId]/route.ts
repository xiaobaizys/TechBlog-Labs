import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/* ============================================================
 * GET /api/ai/chat/history/[sessionId]
 *   → 返回指定会话的所有消息
 * ============================================================ */
export const GET = async (
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ success: false, error: "未登录" }, { status: 401 });
    }
    const { sessionId } = await params;

    const chatSession = await prisma.aIChatSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
    });
    if (!chatSession) {
      return Response.json({ success: false, error: "会话不存在" }, { status: 404 });
    }

    const messages = await prisma.aIChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        sources: true,
        createdAt: true,
      },
    });

    return Response.json({
      success: true,
      data: {
        session: { id: chatSession.id, title: chatSession.title },
        messages: messages.map((m) => ({
          ...m,
          sources: m.sources ? JSON.parse(m.sources) : undefined,
        })),
      },
    });
  } catch (error) {
    console.error("[GET /api/ai/chat/history/[sessionId]]", error);
    return Response.json({ success: false, error: "服务异常" }, { status: 500 });
  }
};

/* ============================================================
 * DELETE /api/ai/chat/history/[sessionId]
 *   → 删除指定会话（级联删除消息）
 * ============================================================ */
export const DELETE = async (
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ success: false, error: "未登录" }, { status: 401 });
    }
    const { sessionId } = await params;

    const chatSession = await prisma.aIChatSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
    });
    if (!chatSession) {
      return Response.json({ success: false, error: "会话不存在" }, { status: 404 });
    }

    await prisma.aIChatSession.delete({ where: { id: sessionId } });

    return Response.json({ success: true, data: null });
  } catch (error) {
    console.error("[DELETE /api/ai/chat/history/[sessionId]]", error);
    return Response.json({ success: false, error: "服务异常" }, { status: 500 });
  }
};