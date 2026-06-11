import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/admin/users/:id — 软删除用户（管理员）
 *
 * - 不能删除自己
 * - 设置 deletedAt 时间戳
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const { id } = params;

    // 不能删除自己
    if (id === session.user.id) {
      return NextResponse.json(
        { success: false, message: "不能删除自己的账号" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, deletedAt: true },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, message: "用户不存在" }, { status: 404 });
    }

    // 检查是否已删除
    if (targetUser.deletedAt) {
      return NextResponse.json({
        success: true,
        message: "用户已被删除，无需重复操作",
      });
    }

    // 软删除
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // 同时使该用户的所有 session 失效
    await prisma.session.deleteMany({ where: { userId: id } });

    return NextResponse.json({
      success: true,
      message: `已删除用户 ${targetUser.name || targetUser.email}`,
    });
  } catch (error) {
    console.error("[DELETE /api/admin/users/:id]", error);
    return NextResponse.json({ success: false, message: "操作失败" }, { status: 500 });
  }
}
