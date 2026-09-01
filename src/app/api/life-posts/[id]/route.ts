import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateLifePosts } from "@/lib/cache";
import { z } from "zod";

const UpdateSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  // 与 POST 一致：允许 /uploads/... 相对路径或 https://... 外链
  images: z
    .array(
      z
        .string()
        .min(1)
        .refine(
          (v) => v.startsWith("/") || /^https?:\/\//i.test(v),
          "图片地址必须是相对路径（/uploads/...）或完整 URL"
        )
    )
    .max(9)
    .optional(),
  isPublic: z.boolean().optional(),
});

// ============================================================
// GET — 单条分享详情
// ============================================================
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const post = await prisma.lifePost.findUnique({
      where: { id: params.id },
      select: {
        id: true, content: true, images: true, likeCount: true, isPublic: true,
        createdAt: true, updatedAt: true,
        author: { select: { id: true, name: true, image: true } },
        ...(session?.user?.id
          ? { likes: { where: { userId: session.user.id }, select: { id: true } } }
          : {}),
      },
    });

    if (!post) {
      return NextResponse.json({ success: false, message: "分享不存在" }, { status: 404 });
    }

    if (!post.isPublic) {
      // 私密分享只有作者本人可看（管理员也没有查看他人私密分享的权限）
      const isOwner = session?.user?.id === post.author.id;
      if (!isOwner) {
        return NextResponse.json({ success: false, message: "分享不存在" }, { status: 404 });
      }
    }

    const { likes, ...rest } = post as any;
    return NextResponse.json({
      success: true,
      data: { ...rest, isLiked: likes ? likes.length > 0 : false },
    });
  } catch (error) {
    console.error("[GET /api/life-posts/:id]", error);
    return NextResponse.json({ success: false, message: "获取失败" }, { status: 500 });
  }
}

// ============================================================
// PUT — 更新分享
// ============================================================
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "请先登录" }, { status: 401 });
    }

    const existing = await prisma.lifePost.findUnique({
      where: { id: params.id }, select: { authorId: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: "分享不存在" }, { status: 404 });
    }

    // 权限检查：作者本人或管理员可以编辑
    const isAdmin = (session.user as { role?: string })?.role === "ADMIN";
    if (existing.authorId !== session.user.id && !isAdmin) {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const post = await prisma.lifePost.update({
      where: { id: params.id },
      data: parsed.data,
      select: {
        id: true, content: true, images: true, likeCount: true, isPublic: true,
        createdAt: true, updatedAt: true,
        author: { select: { id: true, name: true, image: true } },
      },
    });

    revalidateLifePosts();
    return NextResponse.json({ success: true, message: "更新成功", data: post });
  } catch (error) {
    console.error("[PUT /api/life-posts/:id]", error);
    return NextResponse.json({ success: false, message: "更新失败" }, { status: 500 });
  }
}

// ============================================================
// DELETE — 删除分享
// ============================================================
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "请先登录" }, { status: 401 });
    }

    const existing = await prisma.lifePost.findUnique({
      where: { id: params.id }, select: { authorId: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: "分享不存在" }, { status: 404 });
    }

    // 权限检查：作者本人或管理员可以删除
    const isAdmin = (session.user as { role?: string })?.role === "ADMIN";
    if (existing.authorId !== session.user.id && !isAdmin) {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    await prisma.lifePost.delete({ where: { id: params.id } });

    revalidateLifePosts();
    return NextResponse.json({ success: true, message: "已删除" });
  } catch (error) {
    console.error("[DELETE /api/life-posts/:id]", error);
    return NextResponse.json({ success: false, message: "删除失败" }, { status: 500 });
  }
}

// ============================================================
// PATCH — 部分更新分享（管理员可用）
// ============================================================
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "请先登录" }, { status: 401 });
    }

    const existing = await prisma.lifePost.findUnique({
      where: { id: params.id }, select: { authorId: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: "分享不存在" }, { status: 404 });
    }

    // 权限检查：作者本人或管理员可以更新
    const isAdmin = (session.user as { role?: string })?.role === "ADMIN";
    if (existing.authorId !== session.user.id && !isAdmin) {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const post = await prisma.lifePost.update({
      where: { id: params.id },
      data: parsed.data,
      select: {
        id: true, content: true, images: true, likeCount: true, isPublic: true,
        createdAt: true, updatedAt: true,
        author: { select: { id: true, name: true, image: true } },
      },
    });

    revalidateLifePosts();
    return NextResponse.json({ success: true, message: "更新成功", data: post });
  } catch (error) {
    console.error("[PATCH /api/life-posts/:id]", error);
    return NextResponse.json({ success: false, message: "更新失败" }, { status: 500 });
  }
}
