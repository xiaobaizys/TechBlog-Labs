import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlug } from "@/lib/slugify";
import { revalidatePosts } from "@/lib/cache";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

// ============================================================
// Schema
// ============================================================

// 封面图验证：空串 → null；相对路径（/uploads/...）或绝对 URL 均可
const CoverImageSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z
    .string()
    .min(1)
    .refine(
      (v) => v.startsWith("/") || /^https?:\/\//i.test(v),
      "封面图必须是相对路径（/uploads/...）或完整 URL"
    )
    .nullable()
    .optional()
);

const CreatePostSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200),
  content: z.string().min(1, "内容不能为空"),
  excerpt: z.string().max(500).optional().nullable(),
  coverImage: CoverImageSchema,
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional().default("DRAFT"),
  featured: z.boolean().optional().default(false),
});

// ============================================================
// GET — 公开文章列表
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10)));
    const tag = searchParams.get("tag");
    const status = searchParams.get("status");

    // ---------- 构建查询条件 ----------
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    // 公开列表默认只返回 PUBLISHED
    if (status === "PUBLISHED" || !status) {
      where.status = "PUBLISHED";
    } else if (status === "all") {
      // 不限制状态（供某些场景使用）
    }

    // 标签筛选
    if (tag) {
      where.tags = {
        some: {
          tag: { slug: tag },
        },
      };
    }

    // ---------- 并行查询 ----------
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          status: true,
          featured: true,
          viewCount: true,
          likeCount: true,
          publishedAt: true,
          createdAt: true,
          author: {
            select: { id: true, name: true, image: true },
          },
          tags: {
            select: {
              tag: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      }),
      prisma.post.count({ where: where as any }),
    ]);

    // 格式化标签
    const formatted = posts.map((post) => ({
      ...post,
      tags: post.tags.map((t) => t.tag),
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[GET /api/posts]", error);
    return NextResponse.json(
      { success: false, message: "获取文章列表失败" },
      { status: 500 }
    );
  }
}

// ============================================================
// POST — 创建文章（管理员）
// ============================================================
export const POST = withRateLimit(RATE_LIMITS.write, async (request: NextRequest) => {
  try {
    // ---------- 验证管理员权限 ----------
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
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

    const parsed = CreatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { title, content, excerpt, coverImage, tags, status, featured } =
      parsed.data;

    // ---------- 生成唯一 slug ----------
    let slug = slugify(title);
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (existing) {
      slug = uniqueSlug(title);
    }

    // ---------- 处理标签 ----------
    const tagRecords = await upsertTags(tags);

    // ---------- 创建文章 ----------
    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        excerpt: excerpt ?? null,
        coverImage: coverImage ?? null,
        status,
        featured,
        authorId: session.user.id,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        tags: {
          create: tagRecords.map((tag) => ({ tagId: tag.id })),
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        coverImage: true,
        status: true,
        featured: true,
        publishedAt: true,
        createdAt: true,
        author: { select: { id: true, name: true, image: true } },
        tags: {
          select: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    // 写操作后失效缓存，前台列表/详情立即看到新文章
    revalidatePosts();

    return NextResponse.json(
      {
        success: true,
        message: "文章创建成功",
        data: { ...post, tags: post.tags.map((t) => t.tag) },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/posts]", error);
    return NextResponse.json(
      { success: false, message: "创建文章失败" },
      { status: 500 }
    );
  }
});

// ============================================================
// 工具：批量创建/查找标签
// ============================================================
async function upsertTags(tagNames: string[]) {
  const tags: { id: string }[] = [];

  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    const tagSlug = slugify(trimmed);

    const tag = await prisma.tag.upsert({
      where: { slug: tagSlug },
      update: {},
      create: { name: trimmed, slug: tagSlug },
      select: { id: true },
    });

    tags.push(tag);
  }

  return tags;
}
