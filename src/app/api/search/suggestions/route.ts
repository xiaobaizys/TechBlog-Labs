import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { escapeLikePattern } from "@/lib/search";
import { unstable_cache } from "next/cache";

/**
 * GET /api/search/suggestions
 *
 * 自动补全：用户输入 1+ 字符时返回最多 8 条建议
 *   type=posts    → 文章标题
 *   type=projects → 项目标题
 *   默认 posts
 *
 * 性能：标题列有索引 + 只 SELECT 一列，1000+ 行下 < 30ms
 *       再用 unstable_cache 把热门前缀缓存 30s
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const type = sp.get("type") === "projects" ? "projects" : "posts";
    const q = (sp.get("q") ?? "").trim();

    // 至少 1 个字符才建议，避免空请求打 DB
    if (q.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const cacheKey = `${type}:${q.toLowerCase()}`;
    const fetcher = unstable_cache(
      async () => {
        const where = {
          title: {
            contains: escapeLikePattern(q),
            mode: "insensitive" as const,
          },
          ...(type === "posts"
            ? { status: "PUBLISHED" as const, deletedAt: null }
            : { isPublic: true }),
        };

        if (type === "posts") {
          const rows = await prisma.post.findMany({
            where,
            orderBy: [{ featured: "desc" }, { viewCount: "desc" }],
            take: 8,
            select: { id: true, title: true, slug: true },
          });
          return rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug }));
        } else {
          const rows = await prisma.project.findMany({
            where,
            orderBy: [{ featured: "desc" }, { viewCount: "desc" }],
            take: 8,
            select: { id: true, title: true, slug: true },
          });
          return rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug }));
        }
      },
      ["search-suggestions", cacheKey, type],
      { revalidate: 30, tags: ["search", type] }
    );

    const data = await fetcher();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[GET /api/search/suggestions]", error);
    return NextResponse.json(
      { success: false, message: "获取建议失败" },
      { status: 500 }
    );
  }
}
