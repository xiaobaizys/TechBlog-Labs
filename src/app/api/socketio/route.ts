import { NextResponse } from "next/server";

/**
 * Socket.io API Route
 *
 * 注意：Next.js App Router 不直接支持 WebSocket。
 * 这个路由用于初始化 Socket.io 服务器。
 *
 * 实际的 WebSocket 连接需要通过自定义服务器处理。
 * 当前实现使用轮询作为降级方案。
 */

// 存储待推送的消息
const pendingMessages: Array<{
  event: string;
  data: any;
  timestamp: number;
}> = [];

const MAX_MESSAGES = 100;

/**
 * POST /api/socketio
 * 发送实时消息（用于测试）
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, data } = body;

    if (!event) {
      return NextResponse.json(
        { error: "Event name is required" },
        { status: 400 }
      );
    }

    // 添加到待推送队列
    pendingMessages.push({
      event,
      data,
      timestamp: Date.now(),
    });

    // 限制队列大小
    if (pendingMessages.length > MAX_MESSAGES) {
      pendingMessages.splice(0, pendingMessages.length - MAX_MESSAGES);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/socketio]", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/socketio
 * 获取待推送的消息（轮询模式）
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = parseInt(searchParams.get("since") || "0", 10);

  // 返回指定时间之后的消息
  const messages = pendingMessages.filter((m) => m.timestamp > since);

  return NextResponse.json({
    messages,
    timestamp: Date.now(),
  });
}
