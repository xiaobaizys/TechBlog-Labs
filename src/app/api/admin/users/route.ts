import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/users — 用户列表（管理员）
 *
 * 支持分页：?page=1&pageSize=10
 * 支持搜索：?search=关键词（搜索 name 或 email）
 * 支持角色筛选：?role=ADMIN/USER
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10)));
    const search = searchParams.get("search")?.trim();
    const role = searchParams.get("role");

    // ---------- 构建查询条件 ----------
    const where: Record<string, unknown> = {};

    // 搜索
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // 角色筛选
    if (role === "ADMIN" || role === "USER") {
      where.role = role;
    }

    // ---------- 并行查询 ----------
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          deletedAt: true,
          _count: {
            select: { posts: true, comments: true },
          },
        },
      }),
      prisma.user.count({ where: where as any }),
    ]);

    return NextResponse.json({
      success: true,
      data: users,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("[GET /api/admin/users]", error);
    return NextResponse.json({ success: false, message: "获取用户列表失败" }, { status: 500 });
  }
}
