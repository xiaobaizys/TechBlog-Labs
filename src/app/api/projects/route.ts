import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlug } from "@/lib/slugify";
import { revalidateProjects } from "@/lib/cache";
import { z } from "zod";

// 复用的 URL 校验：允许 /uploads/... 相对路径或 https?://... 外链
const flexibleUrl = z
  .string()
  .min(1)
  .refine(
    (v) => v.startsWith("/") || /^https?:\/\//i.test(v),
    "必须是相对路径（/uploads/...）或完整 URL"
  )
  .optional()
  .nullable();

const CreateProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  content: z.string().optional(),
  coverImage: flexibleUrl,
  techStack: z.array(z.string()).optional().default([]),
  repoUrl: flexibleUrl,
  demoUrl: flexibleUrl,
  downloadUrl: flexibleUrl,
  isPublic: z.boolean().optional().default(true),
  featured: z.boolean().optional().default(false),
});

// ============================================================
// GET — 公开项目列表（支持分页+技术栈筛选）
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(20, Math.max(1, parseInt(searchParams.get("pageSize") ?? "6")));
    const tech = searchParams.get("tech");

    const where: Record<string, unknown> = { isPublic: true };
    if (tech) {
      where.techStack = { has: tech };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: where as any,
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, title: true, slug: true, description: true, coverImage: true,
          techStack: true, repoUrl: true, demoUrl: true,
          viewCount: true, likeCount: true, featured: true,
          createdAt: true,
          author: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.project.count({ where: where as any }),
    ]);

    return NextResponse.json({
      success: true,
      data: projects,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("[GET /api/projects]", error);
    return NextResponse.json({ success: false, message: "获取失败" }, { status: 500 });
  }
}

// ============================================================
// POST — 创建项目（管理员）
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ success: false, message: "请求体不能为空" }, { status: 400 });

    const parsed = CreateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.errors[0].message }, { status: 400 });
    }

    let slug = slugify(parsed.data.title);
    const exists = await prisma.project.findUnique({ where: { slug } });
    if (exists) slug = uniqueSlug(parsed.data.title);

    const project = await prisma.project.create({
      data: {
        ...parsed.data,
        slug,
        coverImage: parsed.data.coverImage ?? null,
        repoUrl: parsed.data.repoUrl ?? null,
        demoUrl: parsed.data.demoUrl ?? null,
        downloadUrl: parsed.data.downloadUrl ?? null,
        content: parsed.data.content ?? null,
        authorId: session.user.id,
      },
      select: {
        id: true, title: true, slug: true, description: true, coverImage: true,
        techStack: true, repoUrl: true, demoUrl: true,
        viewCount: true, likeCount: true, isPublic: true, featured: true,
        createdAt: true,
        author: { select: { id: true, name: true, image: true } },
      },
    });

    revalidateProjects();
    return NextResponse.json({ success: true, message: "创建成功", data: project }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects]", error);
    return NextResponse.json({ success: false, message: "创建失败" }, { status: 500 });
  }
}
