import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { revalidateLifePosts } from "@/lib/cache";
import { z } from "zod";

// ============================================================
// Schema
// ============================================================
const CreateLifePostSchema = z.object({
  content: z.string().min(1, "内容不能为空").max(500, "内容最多500字"),
  // 图片地址：既支持相对路径（/uploads/xxx.jpg，本项目默认），
  // 也支持外链完整 URL（https://...），避免 z.string().url() 拦截本地路径
  images: z
    .array(
      z
        .string()
        .min(1, "图片地址不能为空")
        .refine(
          (v) => v.startsWith("/") || /^https?:\/\//i.test(v),
          "图片地址必须是相对路径（/uploads/...）或完整 URL"
        )
    )
    .max(9, "最多9张图片")
    .optional()
    .default([]),
  isPublic: z.boolean().optional().default(true),
});

// ============================================================
// GET — 公开分享列表
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(30, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10)));

    const where = { isPublic: true };

    const [posts, total] = await Promise.all([
      prisma.lifePost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          content: true,
          images: true,
          likeCount: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { id: true, name: true, image: true } },
          ...(session?.user?.id
            ? {
                likes: {
                  where: { userId: session.user.id },
                  select: { id: true },
                },
              }
            : {}),
        },
      }),
      prisma.lifePost.count({ where }),
    ]);

    const formatted = posts.map(({ likes, ...post }) => ({
      ...post,
      isLiked: likes ? likes.length > 0 : false,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("[GET /api/life-posts]", error);
    return NextResponse.json({ success: false, message: "获取失败" }, { status: 500 });
  }
}

// ============================================================
// POST — 发布分享
// ============================================================
export const POST = withRateLimit(RATE_LIMITS.write, async (request: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "请先登录" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "请求体不能为空" }, { status: 400 });
    }

    const parsed = CreateLifePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const post = await prisma.lifePost.create({
      data: {
        content: parsed.data.content.trim(),
        images: parsed.data.images,
        isPublic: parsed.data.isPublic,
        authorId: session.user.id,
      },
      select: {
        id: true,
        content: true,
        images: true,
        likeCount: true,
        isPublic: true,
        createdAt: true,
        author: { select: { id: true, name: true, image: true } },
      },
    });

    revalidateLifePosts();
    return NextResponse.json(
      { success: true, message: "发布成功", data: { ...post, isLiked: false } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/life-posts]", error);
    return NextResponse.json({ success: false, message: "发布失败" }, { status: 500 });
  }
});
