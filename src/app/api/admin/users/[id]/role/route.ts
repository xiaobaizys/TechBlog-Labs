import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const RoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"], { required_error: "角色值无效" }),
});

/**
 * PUT /api/admin/users/:id/role — 修改用户角色（管理员）
 *
 * - 不能修改自己的角色
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const { id } = params;

    // 不能修改自己的角色
    if (id === session.user.id) {
      return NextResponse.json(
        { success: false, message: "不能修改自己的角色" },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, message: "用户不存在" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = RoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role as any },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({
      success: true,
      message: `已将 ${user.name || user.email} 的角色修改为 ${user.role}`,
      data: user,
    });
  } catch (error) {
    console.error("[PUT /api/admin/users/:id/role]", error);
    return NextResponse.json({ success: false, message: "操作失败" }, { status: 500 });
  }
}
