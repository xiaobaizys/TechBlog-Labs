import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/admin/home-backgrounds/[id] — 更新背景图片
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { url, name, sortOrder, isActive } = body;

    const data: Record<string, string | number | boolean> = {};
    if (url !== undefined) data.url = url;
    if (name !== undefined) data.name = name;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;

    const bg = await prisma.homeBackground.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: bg });
  } catch (error) {
    console.error("[PUT /api/admin/home-backgrounds/[id]]", error);
    return NextResponse.json({ success: false, message: "更新失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/home-backgrounds/[id] — 删除背景图片
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.homeBackground.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/home-backgrounds/[id]]", error);
    return NextResponse.json({ success: false, message: "删除失败" }, { status: 500 });
  }
}