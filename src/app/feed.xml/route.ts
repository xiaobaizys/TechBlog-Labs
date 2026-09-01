import { NextResponse } from "next/server";

// 强制动态渲染，避免构建时静态预渲染 redirect 失败
export const dynamic = "force-dynamic";

/**
 * /feed.xml 已合并到 /rss.xml
 *
 * 保留 308 永久重定向，避免已订阅 /feed.xml 的 RSS 阅读器失效，
 * 同时消除两个 RSS 端点重复维护的问题。
 */
export async function GET() {
  return NextResponse.redirect("/rss.xml", 308);
}
