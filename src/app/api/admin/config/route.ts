import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ============================================================
// 配置项预设（默认值）
// ============================================================

const DEFAULT_CONFIG: Record<string, string> = {
  site_title: "TechBlog Labs",
  site_description: "技术博客与创意实验室",
  seo_keywords: "技术博客,编程,Next.js,React",
  posts_per_page: "9",
  comments_per_page: "20",
  enable_comments: "true",
  enable_likes: "true",
};

// ============================================================
// GET — 获取所有配置
// ============================================================
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    // 从数据库读取配置，未设置的使用默认值
    const dbConfigs = await prisma.systemConfig.findMany();
    const config: Record<string, string> = { ...DEFAULT_CONFIG };

    for (const item of dbConfigs) {
      config[item.key] = item.value;
    }

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error("[GET /api/admin/config]", error);
    return NextResponse.json({ success: false, message: "获取配置失败" }, { status: 500 });
  }
}

// ============================================================
// Schema
// ============================================================

const UpdateConfigSchema = z.record(z.string(), z.string());

// ============================================================
// PUT — 批量更新配置
// ============================================================
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, message: "请求体格式错误" }, { status: 400 });
    }

    const parsed = UpdateConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "数据格式错误" }, { status: 400 });
    }

    // 批量 upsert
    const entries = Object.entries(parsed.data).filter(([, v]) => v !== undefined);

    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.systemConfig.upsert({
          where: { key },
          update: { value, updatedAt: new Date() },
          create: { key, value },
        })
      )
    );

    // 清除配置缓存（通过 touch 触发重新加载）
    await prisma.systemConfig.upsert({
      where: { key: "_cache_version" },
      update: { value: String(Date.now()) },
      create: { key: "_cache_version", value: String(Date.now()) },
    });

    return NextResponse.json({ success: true, message: "配置已更新" });
  } catch (error) {
    console.error("[PUT /api/admin/config]", error);
    return NextResponse.json({ success: false, message: "更新配置失败" }, { status: 500 });
  }
}
