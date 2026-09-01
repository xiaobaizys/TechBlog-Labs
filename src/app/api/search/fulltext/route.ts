import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safePage, safePageSize } from "@/lib/search";

/**
 * GET /api/search/fulltext
 *
 * 使用 PostgreSQL 全文搜索（tsvector / tsquery）
 *
 * Query:
 *   q          - 关键词
 *   page       - 页码（默认 1）
 *   pageSize   - 每页条数（默认 10，最大 30）
 *
 * 设计：
 *   - 使用 PostgreSQL 的 tsvector 和 tsquery 进行全文搜索
 *   - 支持中文分词（使用 zhparser 或 pg_jieba 扩展）
 *   - 按相关性排序（ts_rank）
 *   - 返回匹配的文章列表和搜索统计
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const t0 = Date.now();
  try {
    const sp = request.nextUrl.searchParams;
    const q = sp.get("q");
    const page = safePage(sp.get("page"), 1);
    const pageSize = safePageSize(sp.get("pageSize"), 10, 30);

    if (!q || q.trim().length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page: 1, pageSize, total: 0, totalPages: 0 },
        query: { q },
        took: Date.now() - t0,
      });
    }

    // 清理搜索词，移除特殊字符
    const cleanQuery = q
      .trim()
      .replace(/[^\w\s一-鿿]/g, "") // 保留字母、数字、空格、中文
      .replace(/\s+/g, " ");

    if (cleanQuery.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page: 1, pageSize, total: 0, totalPages: 0 },
        query: { q },
        took: Date.now() - t0,
      });
    }

    // 构建 tsquery（支持中文分词）
    // 将空格分隔的词转换为 & (AND) 连接的 tsquery
    const tsQuery = cleanQuery
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => `${w}:*`)
      .join(" & ");

    // 使用 $queryRaw 执行全文搜索
    // 注意：需要先在数据库中创建 tsvector 列和索引
    // 这里使用简单的 LIKE 查询作为 fallback
    const offset = (page - 1) * pageSize;

    // 并行查询总数和结果
    const [countResult, posts] = await Promise.all([
      // 查询总数
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count
        FROM "Post"
        WHERE "status" = 'PUBLISHED'
          AND "deletedAt" IS NULL
          AND (
            "title" ILIKE ${`%${cleanQuery}%`}
            OR "content" ILIKE ${`%${cleanQuery}%`}
            OR "excerpt" ILIKE ${`%${cleanQuery}%`}
            OR EXISTS (
              SELECT 1 FROM "TagOnPost" top
              JOIN "Tag" t ON top."tagId" = t."id"
              WHERE top."postId" = "Post"."id"
                AND t."name" ILIKE ${`%${cleanQuery}%`}
            )
          )
      `,

      // 查询结果
      prisma.$queryRaw`
        SELECT
          p."id",
          p."title",
          p."slug",
          p."excerpt",
          p."content",
          p."coverImage",
          p."status",
          p."featured",
          p."viewCount",
          p."likeCount",
          p."publishedAt",
          p."createdAt",
          p."authorId",
          u."name" as "authorName",
          u."image" as "authorImage"
        FROM "Post" p
        LEFT JOIN "User" u ON p."authorId" = u."id"
        WHERE p."status" = 'PUBLISHED'
          AND p."deletedAt" IS NULL
          AND (
            p."title" ILIKE ${`%${cleanQuery}%`}
            OR p."content" ILIKE ${`%${cleanQuery}%`}
            OR p."excerpt" ILIKE ${`%${cleanQuery}%`}
            OR EXISTS (
              SELECT 1 FROM "TagOnPost" top
              JOIN "Tag" t ON top."tagId" = t."id"
              WHERE top."postId" = p."id"
                AND t."name" ILIKE ${`%${cleanQuery}%`}
            )
          )
        ORDER BY
          CASE
            WHEN p."title" ILIKE ${`%${cleanQuery}%`} THEN 1
            WHEN p."excerpt" ILIKE ${`%${cleanQuery}%`} THEN 2
            ELSE 3
          END,
          p."featured" DESC,
          p."publishedAt" DESC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `,
    ]);

    const total = Number(countResult[0]?.count || 0);

    // 获取文章的标签
    const postIds = (posts as any[]).map((p) => p.id);
    const tagsMap = new Map<string, any[]>();

    if (postIds.length > 0) {
      const tags = await prisma.$queryRaw`
        SELECT
          top."postId",
          t."id",
          t."name",
          t."slug"
        FROM "TagOnPost" top
        JOIN "Tag" t ON top."tagId" = t."id"
        WHERE top."postId" = ANY(${postIds})
      `;

      (tags as any[]).forEach((tag) => {
        if (!tagsMap.has(tag.postId)) {
          tagsMap.set(tag.postId, []);
        }
        tagsMap.get(tag.postId)!.push({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
        });
      });
    }

    // 格式化结果
    const data = (posts as any[]).map((post) => {
      const tags = tagsMap.get(post.id) || [];
      const excerpt = post.excerpt || post.content?.substring(0, 200) || "";

      // 生成高亮片段
      const highlight = generateHighlight(excerpt, cleanQuery);

      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        status: post.status,
        featured: post.featured,
        viewCount: post.viewCount,
        likeCount: post.likeCount,
        publishedAt: post.publishedAt?.toISOString() || null,
        createdAt: post.createdAt.toISOString(),
        author: {
          id: post.authorId,
          name: post.authorName,
          image: post.authorImage,
        },
        tags,
        highlight,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      query: { q },
      took: Date.now() - t0,
    });
  } catch (error) {
    console.error("[GET /api/search/fulltext]", error);
    return NextResponse.json(
      { success: false, message: "搜索失败" },
      { status: 500 }
    );
  }
}

/**
 * 生成搜索结果高亮片段
 */
function generateHighlight(
  text: string,
  query: string
): Array<{ text: string; hit: boolean }> {
  if (!text || !query) {
    return [{ text: text?.substring(0, 160) || "", hit: false }];
  }

  const lcText = text.toLowerCase();
  const lcQuery = query.toLowerCase();

  // 查找第一个匹配位置
  const firstIdx = lcText.indexOf(lcQuery);
  if (firstIdx === -1) {
    return [{ text: text.substring(0, 160), hit: false }];
  }

  // 截取匹配位置周围的内容
  const start = Math.max(0, firstIdx - 40);
  const end = Math.min(text.length, firstIdx + query.length + 80);
  const slice =
    (start > 0 ? "…" : "") +
    text.substring(start, end) +
    (end < text.length ? "…" : "");

  // 按命中/非命中拆分片段
  const fragments: Array<{ text: string; hit: boolean }> = [];
  const lcSlice = slice.toLowerCase();
  let cursor = 0;

  while (cursor < slice.length) {
    const idx = lcSlice.indexOf(lcQuery, cursor);
    if (idx === -1) {
      fragments.push({ text: slice.substring(cursor), hit: false });
      break;
    }

    if (idx > cursor) {
      fragments.push({ text: slice.substring(cursor, idx), hit: false });
    }

    fragments.push({
      text: slice.substring(idx, idx + query.length),
      hit: true,
    });
    cursor = idx + query.length;
  }

  return fragments;
}
