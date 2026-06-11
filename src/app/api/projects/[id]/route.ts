import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateProjects } from "@/lib/cache";
import { z } from "zod";

// 允许 /uploads/... 相对路径或 https?://... 外链
const flexibleUrl = z
  .string()
  .min(1)
  .refine(
    (v) => v.startsWith("/") || /^https?:\/\//i.test(v),
    "必须是相对路径（/uploads/...）或完整 URL"
  )
  .optional()
  .nullable();

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  content: z.string().optional().nullable(),
  coverImage: flexibleUrl,
  techStack: z.array(z.string()).optional(),
  repoUrl: flexibleUrl,
  demoUrl: flexibleUrl,
  downloadUrl: flexibleUrl,
  isPublic: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// ============================================================
// GET — 项目详情
// ============================================================
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const project = await prisma.project.findFirst({
      where: { OR: [{ slug: params.id }, { id: params.id }] },
      select: {
        id: true, title: true, slug: true, description: true, content: true,
        coverImage: true, techStack: true, repoUrl: true, demoUrl: true, downloadUrl: true,
        viewCount: true, likeCount: true, isPublic: true, featured: true,
        createdAt: true, updatedAt: true,
        author: { select: { id: true, name: true, image: true } },
        ...(session?.user?.id
          ? { likes: { where: { userId: session.user.id }, select: { id: true } } }
          : {}),
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, message: "项目不存在" }, { status: 404 });
    }

    if (!project.isPublic) {
      const isAdmin = session?.user?.role === "ADMIN";
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: "项目不存在" }, { status: 404 });
      }
    }

    // viewCount +1
    await prisma.project.update({ where: { id: project.id }, data: { viewCount: { increment: 1 } } });

    const { likes, ...rest } = project as any;
    return NextResponse.json({
      success: true,
      data: { ...rest, viewCount: rest.viewCount + 1, isLiked: likes ? likes.length > 0 : false },
    });
  } catch (error) {
    console.error("[GET /api/projects/:id]", error);
    return NextResponse.json({ success: false, message: "获取失败" }, { status: 500 });
  }
}

// ============================================================
// PUT — 更新项目（管理员）
// ============================================================
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const existing = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ success: false, message: "项目不存在" }, { status: 404 });

    const body = await request.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.errors[0].message }, { status: 400 });
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: parsed.data as any,
      select: {
        id: true, title: true, slug: true, description: true, content: true,
        coverImage: true, techStack: true, repoUrl: true, demoUrl: true, downloadUrl: true,
        viewCount: true, likeCount: true, isPublic: true, featured: true,
        createdAt: true, updatedAt: true,
        author: { select: { id: true, name: true, image: true } },
      },
    });

    revalidateProjects();
    return NextResponse.json({ success: true, message: "更新成功", data: project });
  } catch (error) {
    console.error("[PUT /api/projects/:id]", error);
    return NextResponse.json({ success: false, message: "更新失败" }, { status: 500 });
  }
}

// ============================================================
// DELETE — 删除项目（管理员）
// ============================================================
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const existing = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ success: false, message: "项目不存在" }, { status: 404 });

    await prisma.project.delete({ where: { id: params.id } });

    revalidateProjects();
    return NextResponse.json({ success: true, message: "已删除" });
  } catch (error) {
    console.error("[DELETE /api/projects/:id]", error);
    return NextResponse.json({ success: false, message: "删除失败" }, { status: 500 });
  }
}
