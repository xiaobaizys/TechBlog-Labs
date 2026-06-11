import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tags — 获取所有标签及其使用次数
 *
 * 统计每个标签下的 PUBLISHED 且未删除的文章数量
 */
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            posts: {
              where: {
                post: {
                  status: "PUBLISHED",
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
      orderBy: {
        posts: {
          _count: "desc",
        },
      },
    });

    const formatted = tags
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        postCount: tag._count.posts,
      }))
      .filter((tag) => tag.postCount > 0); // 只返回有文章数量的标签

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("[GET /api/tags]", error);
    return NextResponse.json(
      { success: false, message: "获取标签列表失败" },
      { status: 500 }
    );
  }
}
