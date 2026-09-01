import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/friends/apply - 获取友链申请状态（可选）
 * POST /api/friends/apply - 提交友链申请
 */

// 自动获取网站 favicon
async function getFavicon(url: string): Promise<string | null> {
  try {
    const domain = new URL(url).hostname;
    // 使用 Google favicon API
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

// POST - 提交友链申请
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, avatar, description, category, contact, message } = body;

    // 参数验证
    if (!name || !url) {
      return NextResponse.json(
        { success: false, message: "网站名称和链接不能为空" },
        { status: 400 }
      );
    }

    // 验证 URL 格式
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, message: "请输入有效的网站链接" },
        { status: 400 }
      );
    }

    // 检查是否已存在相同链接
    const existing = await prisma.friendLinkApplication.findFirst({
      where: {
        url,
        status: "PENDING",
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "该链接已有待审核的申请" },
        { status: 400 }
      );
    }

    // 检查是否已经是友链
    const existingLink = await prisma.friendLink.findFirst({
      where: { url },
    });

    if (existingLink) {
      return NextResponse.json(
        { success: false, message: "该链接已经是友情链接" },
        { status: 400 }
      );
    }

    // 自动获取 favicon
    const favicon = await getFavicon(url);

    // 创建申请
    const application = await prisma.friendLinkApplication.create({
      data: {
        name,
        url,
        avatar: avatar || favicon || null,
        description: description || null,
        category: category || null,
        contact: contact || null,
        message: message || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      data: application,
      message: "申请已提交，请等待审核",
    });
  } catch (error) {
    console.error("[POST /api/friends/apply]", error);
    return NextResponse.json(
      { success: false, message: "提交申请失败" },
      { status: 500 }
    );
  }
}
