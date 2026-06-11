import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlug } from "@/lib/slugify";
import { revalidatePosts } from "@/lib/cache";
import { z } from "zod";

// ============================================================
// Schema
// ============================================================

// 允许 /uploads/... 相对路径或 https?://... 外链
// 空串（用户清空封面图）→ 归一为 null
const flexibleUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z
    .string()
    .min(1)
    .refine(
      (v) => v.startsWith("/") || /^https?:\/\//i.test(v),
      "必须是相对路径（/uploads/...）或完整 URL"
    )
    .nullable()
    .optional()
);

const UpdatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(500).optional().nullable(),
  coverImage: flexibleUrl,
  tags: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  featured: z.boolean().optional(),
});

// ============================================================
// PUT — 更新文章
// ============================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ---------- 验证管理员权限 ----------
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
      );
    }

    const { id } = params;

    // ---------- 检查文章是否存在 ----------
    const existing = await prisma.post.findUnique({
      where: { id },
      select: { id: true, slug: true, title: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "文章不存在" },
        { status: 404 }
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

    const parsed = UpdatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { title, content, excerpt, coverImage, tags, status, featured } =
      parsed.data;

    // ---------- 构建更新数据 ----------
    const data: Record<string, unknown> = {};

    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (excerpt !== undefined) data.excerpt = excerpt;
    if (coverImage !== undefined) data.coverImage = coverImage;
    if (featured !== undefined) data.featured = featured;

    // 状态变更
    if (status !== undefined) {
      data.status = status;
      // 首次发布时记录 publishedAt
      if (status === "PUBLISHED" && existing.status !== "PUBLISHED") {
        data.publishedAt = new Date();
      }
    }

    // 标题变更 → 重新生成 slug
    if (title && title !== existing.title) {
      let newSlug = slugify(title);
      const slugExists = await prisma.post.findUnique({
        where: { slug: newSlug },
      });
      if (slugExists && slugExists.id !== id) {
        newSlug = uniqueSlug(title);
      }
      data.slug = newSlug;
    }

    // ---------- 更新文章 ----------
    const post = await prisma.post.update({
      where: { id },
      data,
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
        updatedAt: true,
        author: { select: { id: true, name: true, image: true } },
        tags: {
          select: {
            tag: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    // ---------- 更新标签（如果提供） ----------
    if (tags !== undefined) {
      // 删除旧关联
      await prisma.tagOnPost.deleteMany({ where: { postId: id } });

      // 创建新关联
      for (const tagName of tags) {
        const trimmed = tagName.trim();
        if (!trimmed) continue;

        const tagSlug = slugify(trimmed);
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: trimmed, slug: tagSlug },
          select: { id: true },
        });

        await prisma.tagOnPost.create({
          data: { postId: id, tagId: tag.id },
        });
      }
    }

    // 获取最终标签
    const finalTags = await prisma.tagOnPost.findMany({
      where: { postId: id },
      select: { tag: { select: { id: true, name: true, slug: true } } },
    });

    // 写操作后失效缓存，保证前台列表/详情立即看到新数据
    revalidatePosts();

    return NextResponse.json({
      success: true,
      message: "文章更新成功",
      data: { ...post, tags: finalTags.map((t) => t.tag) },
    });
  } catch (error) {
    console.error("[PUT /api/posts/admin/:id]", error);
    return NextResponse.json(
      { success: false, message: "更新文章失败" },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE — 软删除文章
// ============================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ---------- 验证管理员权限 ----------
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
      );
    }

    const { id } = params;

    // ---------- 检查文章是否存在 ----------
    const existing = await prisma.post.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "文章不存在" },
        { status: 404 }
      );
    }

    // ---------- 操作类型 ----------
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action"); // "restore" 恢复

    if (action === "restore") {
      // 恢复文章
      await prisma.post.update({
        where: { id },
        data: { deletedAt: null },
      });

      revalidatePosts();

      return NextResponse.json({
        success: true,
        message: "文章已恢复",
      });
    }

    // 软删除
    await prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePosts();

    return NextResponse.json({
      success: true,
      message: "文章已删除（可恢复）",
    });
  } catch (error) {
    console.error("[DELETE /api/posts/admin/:id]", error);
    return NextResponse.json(
      { success: false, message: "操作失败" },
      { status: 500 }
    );
  }
}
