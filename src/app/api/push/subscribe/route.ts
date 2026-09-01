import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getVapidPublicKey,
  addSubscription,
  removeSubscription,
  broadcastNotification,
  sendNewPostNotification,
} from "@/lib/push-notification";

/**
 * GET /api/push/vapid-key
 * 获取 VAPID 公钥
 */
export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "Push notifications not configured" },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey });
}

/**
 * POST /api/push/subscribe
 * 订阅推送通知
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Invalid subscription" },
        { status: 400 }
      );
    }

    addSubscription(session.user.id, subscription);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/push/subscribe]", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push/subscribe
 * 取消订阅
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    removeSubscription(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/push/subscribe]", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
