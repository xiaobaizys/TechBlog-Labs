import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePosts } from "@/lib/cache";

/**
 * DELETE /api/comments/:id — 删除评论
 *
 * - 作者本人或管理员可删除
 * - 级联删除所有子回复
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ---------- 验证登录 ----------
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const { id } = params;
    const isAdmin = session.user.role === "ADMIN";

    // ---------- 查找评论 ----------
    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });

    if (!comment) {
      return NextResponse.json(
        { success: false, message: "评论不存在" },
        { status: 404 }
      );
    }

    // ---------- 权限检查 ----------
    if (comment.authorId !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "无权限删除该评论" },
        { status: 403 }
      );
    }

    // ---------- 递归收集所有子评论ID ----------
    const idsToDelete = await collectReplyIds(id);
    idsToDelete.push(id);

    // ---------- 级联删除 ----------
    await prisma.comment.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    revalidatePosts();
    return NextResponse.json({
      success: true,
      message: `已删除 ${idsToDelete.length} 条评论（含回复）`,
    });
  } catch (error) {
    console.error("[DELETE /api/comments/:id]", error);
    return NextResponse.json(
      { success: false, message: "删除评论失败" },
      { status: 500 }
    );
  }
}

/**
 * 递归收集所有子孙回复的 ID
 */
async function collectReplyIds(parentId: string): Promise<string[]> {
  const children = await prisma.comment.findMany({
    where: { parentId },
    select: { id: true },
  });

  const ids: string[] = [];

  for (const child of children) {
    ids.push(child.id);
    const grandChildIds = await collectReplyIds(child.id);
    ids.push(...grandChildIds);
  }

  return ids;
}
