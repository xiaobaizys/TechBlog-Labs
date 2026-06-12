import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  tokenize,
  buildPostKeywordWhere,
  buildPostTitleWhere,
  safePage,
  safePageSize,
} from "@/lib/search";

/**
 * GET /api/search/posts
 *
 * Query:
 *   q          - 关键词（空格分隔多个，全文 AND 检索）
 *   title      - 仅按标题（精确/模糊）
 *   tag        - 按标签 slug 过滤
 *   page       - 页码（默认 1）
 *   pageSize   - 每页条数（默认 9，最大 30）
 *
 * 设计：
 *   - 关键词 + 标签 + 标题三个维度可任意组合
 *   - 仅返回 PUBLISHED + 未删除的文章
 *   - 附带关键词命中片段（excerpt 截取），供前端展示
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const t0 = Date.now();
  try {
    const sp = request.nextUrl.searchParams;
    const q = sp.get("q");
    const title = sp.get("title");
    const tag = sp.get("tag");
    const page = safePage(sp.get("page"), 1);
    const pageSize = safePageSize(sp.get("pageSize"), 9, 30);

    // ---------- 组合 where ----------
    const tokens = tokenize(q);
    const where = {
      status: "PUBLISHED" as const,
      deletedAt: null,
      ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
      ...(title ? buildPostTitleWhere(title) : {}),
      ...(tokens.length > 0 ? buildPostKeywordWhere(tokens) : {}),
    };

    // ---------- 并行查询 ----------
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
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
          author: { select: { id: true, name: true, image: true } },
          tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    // 格式化 + 命中片段截取
    const data = posts.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      tags: p.tags.map((t) => t.tag),
      highlight: buildHighlight(p.excerpt, p.title, tokens),
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      query: { q, title, tag },
      took: Date.now() - t0,
    });
  } catch (error) {
    console.error("[GET /api/search/posts]", error);
    return NextResponse.json(
      { success: false, message: "搜索失败" },
      { status: 500 }
    );
  }
}

/**
 * 生成搜索结果摘要：
 *  - 优先从 excerpt 里挑出第一个命中 token 周围 ±40 字符
 *  - 没有 excerpt 时回退到 title
 *  - 返回包含若干 {text, hit} 片段的数组，前端可高亮 hit=true 的部分
 */
function buildHighlight(
  excerpt: string | null,
  title: string,
  tokens: string[]
): { text: string; hit: boolean }[] {
  if (tokens.length === 0) {
    return excerpt
      ? [{ text: excerpt.slice(0, 160), hit: false }]
      : [];
  }
  const source = excerpt ?? title;
  if (!source) return [];

  const lc = source.toLowerCase();
  let firstIdx = -1;
  for (const t of tokens) {
    const i = lc.indexOf(t.toLowerCase());
    if (i >= 0 && (firstIdx === -1 || i < firstIdx)) firstIdx = i;
  }
  if (firstIdx === -1) {
    return [{ text: source.slice(0, 160), hit: false }];
  }

  // 截取 [firstIdx-40, firstIdx+80] 区间
  const start = Math.max(0, firstIdx - 40);
  const end = Math.min(source.length, firstIdx + 80);
  const slice = (start > 0 ? "…" : "") + source.slice(start, end) + (end < source.length ? "…" : "");

  // 把 slice 按 hit / non-hit 拆成片段
  const fragments: { text: string; hit: boolean }[] = [];
  const lcSlice = slice.toLowerCase();
  let cursor = 0;
  while (cursor < slice.length) {
    let nextHit = -1;
    let nextToken = "";
    for (const t of tokens) {
      const idx = lcSlice.indexOf(t.toLowerCase(), cursor);
      if (idx >= 0 && (nextHit === -1 || idx < nextHit)) {
        nextHit = idx;
        nextToken = t;
      }
    }
    if (nextHit === -1) {
      fragments.push({ text: slice.slice(cursor), hit: false });
      break;
    }
    if (nextHit > cursor) {
      fragments.push({ text: slice.slice(cursor, nextHit), hit: false });
    }
    const hitEnd = nextHit + nextToken.length;
    fragments.push({ text: slice.slice(nextHit, hitEnd), hit: true });
    cursor = hitEnd;
  }
  return fragments;
}
