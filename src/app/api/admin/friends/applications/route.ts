import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/friends/applications - 获取所有友链申请
 * PUT /api/admin/friends/applications/[id] - 审核友链申请
 */

// GET - 获取所有友链申请
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // 权限检查
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "权限不足" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    const where = status === "all" ? {} : { status: status as any };

    const applications = await prisma.friendLinkApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error("[GET /api/admin/friends/applications]", error);
    return NextResponse.json(
      { success: false, message: "获取申请列表失败" },
      { status: 500 }
    );
  }
}
