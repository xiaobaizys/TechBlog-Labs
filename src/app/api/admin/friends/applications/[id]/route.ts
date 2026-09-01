import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/admin/friends/applications/[id] - 审核友链申请
 * DELETE /api/admin/friends/applications/[id] - 删除友链申请
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

// PUT - 审核友链申请
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
    const { action, rejectReason } = body; // action: "approve" | "reject"

    // 获取申请
    const application = await prisma.friendLinkApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, message: "申请不存在" },
        { status: 404 }
      );
    }

    if (application.status !== "PENDING") {
      return NextResponse.json(
        { success: false, message: "该申请已处理" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // 批准：创建友链并更新申请状态
      const favicon = await getFavicon(application.url);

      await prisma.$transaction([
        // 创建友链
        prisma.friendLink.create({
          data: {
            name: application.name,
            url: application.url,
            avatar: application.avatar,
            favicon: favicon,
            description: application.description,
            category: application.category,
            contact: application.contact,
            status: "APPROVED",
            isActive: true,
          },
        }),
        // 更新申请状态
        prisma.friendLinkApplication.update({
          where: { id },
          data: { status: "APPROVED" },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "申请已批准，友链已添加",
      });
    } else if (action === "reject") {
      // 拒绝：更新申请状态
      await prisma.friendLinkApplication.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectReason: rejectReason || "不符合要求",
        },
      });

      return NextResponse.json({
        success: true,
        message: "申请已拒绝",
      });
    } else {
      return NextResponse.json(
        { success: false, message: "无效的操作" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[PUT /api/admin/friends/applications/:id]", error);
    return NextResponse.json(
      { success: false, message: "审核失败" },
      { status: 500 }
    );
  }
}

// DELETE - 删除友链申请
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

    await prisma.friendLinkApplication.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "申请已删除",
    });
  } catch (error) {
    console.error("[DELETE /api/admin/friends/applications/:id]", error);
    return NextResponse.json(
      { success: false, message: "删除失败" },
      { status: 500 }
    );
  }
}
