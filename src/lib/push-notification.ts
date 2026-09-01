/**
 * Web Push 通知服务
 *
 * 使用 Web Push API 发送推送通知。
 * 需要配置 VAPID 密钥。
 *
 * 生成 VAPID 密钥：
 * npx web-push generate-vapid-keys
 */

import webPush from "web-push";

// ============================================================
// VAPID 配置
// ============================================================

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@vitalog.com";

// 初始化 web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ============================================================
// 类型定义
// ============================================================

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  url?: string;
  data?: Record<string, any>;
}

// ============================================================
// 订阅存储（生产环境建议使用数据库）
// ============================================================

const subscriptions: Map<string, PushSubscription> = new Map();

// ============================================================
// 核心函数
// ============================================================

/**
 * 获取 VAPID 公钥
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

/**
 * 添加订阅
 */
export function addSubscription(
  userId: string,
  subscription: PushSubscription
): void {
  subscriptions.set(userId, subscription);
  console.log(`[Push] Subscription added for user: ${userId}`);
}

/**
 * 删除订阅
 */
export function removeSubscription(userId: string): void {
  subscriptions.delete(userId);
  console.log(`[Push] Subscription removed for user: ${userId}`);
}

/**
 * 获取所有订阅
 */
export function getAllSubscriptions(): Map<string, PushSubscription> {
  return subscriptions;
}

/**
 * 发送推送通知
 */
export async function sendNotification(
  subscription: PushSubscription,
  notification: PushNotification
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[Push] VAPID keys not configured");
    return false;
  }

  try {
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || "/icons/icon-192x192.png",
      badge: notification.badge || "/icons/icon-72x72.png",
      image: notification.image,
      tag: notification.tag || "default",
      url: notification.url || "/",
      data: notification.data || {},
    });

    await webPush.sendNotification(subscription, payload);
    console.log("[Push] Notification sent successfully");
    return true;
  } catch (error: any) {
    console.error("[Push] Failed to send notification:", error.message);

    // 如果订阅失效，删除它
    if (error.statusCode === 410) {
      // 订阅已过期
      console.log("[Push] Subscription expired, should remove");
    }

    return false;
  }
}

/**
 * 向所有订阅者发送通知
 */
export async function broadcastNotification(
  notification: PushNotification
): Promise<{
  success: number;
  failed: number;
}> {
  const allSubscriptions = Array.from(subscriptions.values());
  let success = 0;
  let failed = 0;

  for (const subscription of allSubscriptions) {
    const result = await sendNotification(subscription, notification);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  console.log(`[Push] Broadcast complete: ${success} success, ${failed} failed`);
  return { success, failed };
}

/**
 * 发送新文章通知
 */
export async function sendNewPostNotification(
  post: {
    title: string;
    slug: string;
    excerpt?: string;
  }
): Promise<void> {
  await broadcastNotification({
    title: "新文章发布",
    body: post.title,
    tag: `new-post-${post.slug}`,
    url: `/blog/${post.slug}`,
    data: { type: "new-post", slug: post.slug },
  });
}

/**
 * 发送评论通知
 */
export async function sendCommentNotification(
  userId: string,
  comment: {
    postTitle: string;
    authorName: string;
    content: string;
  }
): Promise<void> {
  const subscription = subscriptions.get(userId);
  if (!subscription) return;

  await sendNotification(subscription, {
    title: "新评论",
    body: `${comment.authorName} 评论了 "${comment.postTitle}"`,
    tag: "new-comment",
    url: `/blog`,
    data: { type: "comment" },
  });
}
