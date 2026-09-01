import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  broadcastNotification,
  sendNewPostNotification,
} from "@/lib/push-notification";

/**
 * POST /api/admin/push
 *
 * 发送推送通知（管理员专用）
 *
 * Body:
 *   {
 *     action: "broadcast" | "new-post",
 *     notification?: { title, body, url },
 *     post?: { title, slug, excerpt }
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { action, notification, post } = body;

    switch (action) {
      case "broadcast": {
        if (!notification?.title || !notification?.body) {
          return NextResponse.json(
            { error: "Missing notification title or body" },
            { status: 400 }
          );
        }

        const result = await broadcastNotification({
          title: notification.title,
          body: notification.body,
          url: notification.url || "/",
          tag: notification.tag || "admin-broadcast",
        });

        return NextResponse.json({
          success: true,
          result,
        });
      }

      case "new-post": {
        if (!post?.title || !post?.slug) {
          return NextResponse.json(
            { error: "Missing post title or slug" },
            { status: 400 }
          );
        }

        await sendNewPostNotification(post);

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[POST /api/admin/push]", error);
    return NextResponse.json(
      { error: "Failed to send push notification" },
      { status: 500 }
    );
  }
}
