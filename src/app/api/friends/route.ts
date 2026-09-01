import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/friends — 获取友情链接列表
 * POST /api/friends — 创建友情链接（管理员）
 */

// 自动获取网站 favicon
async function getFavicon(url: string): Promise<string | null> {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

// GET - 获取友情链接列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";

    // 管理员可以看到所有链接，普通用户只能看到启用的链接
    const where: any = isAdmin ? {} : { isActive: true, status: "APPROVED" };

    // 按分类筛选
    if (category) {
      where.category = category;
    }

    const links = await prisma.friendLink.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });

    // 获取所有分类
    const categories = await prisma.friendLink.findMany({
      where: { isActive: true, status: "APPROVED" },
      select: { category: true },
      distinct: ["category"],
    });

    const uniqueCategories = categories
      .map((c) => c.category)
      .filter(Boolean) as string[];

    return NextResponse.json({
      success: true,
      data: links,
      categories: uniqueCategories,
    });
  } catch (error) {
    console.error("[GET /api/friends]", error);
    return NextResponse.json(
      { success: false, message: "获取友情链接失败" },
      { status: 500 }
    );
  }
}

// POST - 创建友情链接（管理员）
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // 权限检查
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "权限不足" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, url, avatar, description, category, contact, sortOrder, isActive } = body;

    // 参数验证
    if (!name || !url) {
      return NextResponse.json(
        { success: false, message: "名称和链接不能为空" },
        { status: 400 }
      );
    }

    // 自动获取 favicon
    const favicon = await getFavicon(url);

    // 创建友情链接
    const link = await prisma.friendLink.create({
      data: {
        name,
        url,
        avatar: avatar || null,
        favicon: favicon,
        description: description || null,
        category: category || null,
        contact: contact || null,
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
        status: "APPROVED",
      },
    });

    return NextResponse.json({
      success: true,
      data: link,
      message: "友情链接创建成功",
    });
  } catch (error) {
    console.error("[POST /api/friends]", error);
    return NextResponse.json(
      { success: false, message: "创建友情链接失败" },
      { status: 500 }
    );
  }
}
