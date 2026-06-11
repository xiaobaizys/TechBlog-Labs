import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

// ============================================================
// GET /api/comments?postId=xxx&page=1&pageSize=20
// 获取文章评论列表（仅已审核）
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const postId = searchParams.get("postId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));

    if (!postId) {
      return NextResponse.json(
        { success: false, message: "缺少 postId 参数" },
        { status: 400 }
      );
    }

    // ---------- 验证文章存在 ----------
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, message: "文章不存在" },
        { status: 404 }
      );
    }

    // ---------- 查询顶层评论 ----------
    const where = {
      postId,
      isApproved: true,
      parentId: null as string | null,
    };

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          content: true,
          isApproved: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: { id: true, name: true, image: true },
          },
          // 预加载第一层回复
          replies: {
            where: { isApproved: true },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              content: true,
              isApproved: true,
              parentId: true,
              createdAt: true,
              updatedAt: true,
              author: {
                select: { id: true, name: true, image: true },
              },
              replies: {
                where: { isApproved: true },
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  content: true,
                  isApproved: true,
                  parentId: true,
                  createdAt: true,
                  updatedAt: true,
                  author: {
                    select: { id: true, name: true, image: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.comment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: comments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[GET /api/comments]", error);
    return NextResponse.json(
      { success: false, message: "获取评论失败" },
      { status: 500 }
    );
  }
}

// ============================================================
// Schema
// ============================================================

const CreateCommentSchema = z.object({
  postId: z.string().min(1, "文章ID不能为空"),
  content: z
    .string()
    .min(1, "评论内容不能为空")
    .max(5000, "评论内容最长 5000 个字符"),
  parentId: z.string().optional().nullable(),
});

// ============================================================
// POST /api/comments — 发表评论
// ============================================================
export const POST = withRateLimit(RATE_LIMITS.write, async (request: NextRequest) => {
  try {
    // ---------- 验证登录 ----------
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "请先登录" },
        { status: 401 }
      );
    }

    // ---------- 解析请求体 ----------
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, message: "请求体不能为空" },
        { status: 400 }
      );
    }

    const parsed = CreateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { postId, content, parentId } = parsed.data;

    // ---------- 验证文章存在且可评论 ----------
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, status: true, deletedAt: true },
    });

    if (!post || post.deletedAt || post.status !== "PUBLISHED") {
      return NextResponse.json(
        { success: false, message: "文章不存在或不可评论" },
        { status: 404 }
      );
    }

    // ---------- 如果 parentId 存在，验证父评论 ----------
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true, parentId: true },
      });

      if (!parent) {
        return NextResponse.json(
          { success: false, message: "父评论不存在" },
          { status: 404 }
        );
      }

      if (parent.postId !== postId) {
        return NextResponse.json(
          { success: false, message: "父评论不属于该文章" },
          { status: 400 }
        );
      }

      // 限制嵌套深度：最多3层（parent → child → grandchild）
      if (parent.parentId) {
        const grandParent = await prisma.comment.findUnique({
          where: { id: parent.parentId },
          select: { parentId: true },
        });
        if (grandParent?.parentId) {
          return NextResponse.json(
            { success: false, message: "评论嵌套层级已达上限（3层）" },
            { status: 400 }
          );
        }
      }
    }

    // ---------- 创建评论 ----------
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        postId,
        authorId: session.user.id,
        parentId: parentId ?? null,
        isApproved: false,
      },
      select: {
        id: true,
        content: true,
        isApproved: true,
        parentId: true,
        createdAt: true,
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "评论已提交，审核通过后显示",
        data: comment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/comments]", error);
    return NextResponse.json(
      { success: false, message: "发表评论失败" },
      { status: 500 }
    );
  }
});
