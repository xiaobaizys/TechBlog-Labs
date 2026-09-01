import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/friends/:id — 获取单个友情链接
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const link = await prisma.friendLink.findUnique({
      where: { id },
    });

    if (!link) {
      return NextResponse.json(
        { success: false, message: "友情链接不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: link,
    });
  } catch (error) {
    console.error("[GET /api/friends/:id]", error);
    return NextResponse.json(
      { success: false, message: "获取友情链接失败" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/friends/:id — 更新友情链接（管理员）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    // 权限检查
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "权限不足" },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { name, url, avatar, description, sortOrder, isActive } = body;

    // 检查链接是否存在
    const existingLink = await prisma.friendLink.findUnique({
      where: { id },
    });

    if (!existingLink) {
      return NextResponse.json(
        { success: false, message: "友情链接不存在" },
        { status: 404 }
      );
    }

    // 参数验证
    if (!name || !url) {
      return NextResponse.json(
        { success: false, message: "名称和链接不能为空" },
        { status: 400 }
      );
    }

    // 更新友情链接
    const link = await prisma.friendLink.update({
      where: { id },
      data: {
        name,
        url,
        avatar: avatar || null,
        description: description || null,
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({
      success: true,
      data: link,
      message: "友情链接更新成功",
    });
  } catch (error) {
    console.error("[PUT /api/friends/:id]", error);
    return NextResponse.json(
      { success: false, message: "更新友情链接失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/friends/:id — 删除友情链接（管理员）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    // 权限检查
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "权限不足" },
        { status: 403 }
      );
    }

    const { id } = params;

    // 检查链接是否存在
    const existingLink = await prisma.friendLink.findUnique({
      where: { id },
    });

    if (!existingLink) {
      return NextResponse.json(
        { success: false, message: "友情链接不存在" },
        { status: 404 }
      );
    }

    // 删除友情链接
    await prisma.friendLink.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "友情链接删除成功",
    });
  } catch (error) {
    console.error("[DELETE /api/friends/:id]", error);
    return NextResponse.json(
      { success: false, message: "删除友情链接失败" },
      { status: 500 }
    );
  }
}
