import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  tokenize,
  buildProjectKeywordWhere,
  buildProjectTitleWhere,
  safePage,
  safePageSize,
} from "@/lib/search";

/**
 * GET /api/search/projects
 *
 * Query:
 *   q        - 关键词（空格分隔多个）
 *   title    - 仅按标题
 *   tech     - 按技术栈过滤（精确匹配数组中的某一项）
 *   page     - 页码（默认 1）
 *   pageSize - 每页条数（默认 6，最大 30）
 *
 * 设计：
 *   - 关键词 + 技术栈 + 标题三个维度可任意组合
 *   - 仅返回 isPublic=true 的项目
 *   - 返回描述命中片段供前端高亮
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const t0 = Date.now();
  try {
    const sp = request.nextUrl.searchParams;
    const q = sp.get("q");
    const title = sp.get("title");
    const tech = sp.get("tech");
    const page = safePage(sp.get("page"), 1);
    const pageSize = safePageSize(sp.get("pageSize"), 6, 30);

    const tokens = tokenize(q);
    const where = {
      isPublic: true,
      ...(tech ? { techStack: { has: tech } } : {}),
      ...(title ? buildProjectTitleWhere(title) : {}),
      ...(tokens.length > 0 ? buildProjectKeywordWhere(tokens) : {}),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          coverImage: true,
          techStack: true,
          repoUrl: true,
          demoUrl: true,
          viewCount: true,
          likeCount: true,
          featured: true,
          createdAt: true,
          author: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    const data = projects.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      description: p.description ?? "",
      highlight: buildHighlight(p.description ?? "", p.title, tokens),
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
      query: { q, title, tech },
      took: Date.now() - t0,
    });
  } catch (error) {
    console.error("[GET /api/search/projects]", error);
    return NextResponse.json(
      { success: false, message: "搜索失败" },
      { status: 500 }
    );
  }
}

function buildHighlight(
  source: string,
  title: string,
  tokens: string[]
): { text: string; hit: boolean }[] {
  if (tokens.length === 0) {
    return source ? [{ text: source.slice(0, 160), hit: false }] : [];
  }
  const text = source || title;
  if (!text) return [];
  const lc = text.toLowerCase();
  let firstIdx = -1;
  for (const t of tokens) {
    const i = lc.indexOf(t.toLowerCase());
    if (i >= 0 && (firstIdx === -1 || i < firstIdx)) firstIdx = i;
  }
  if (firstIdx === -1) return [{ text: text.slice(0, 160), hit: false }];
  const start = Math.max(0, firstIdx - 40);
  const end = Math.min(text.length, firstIdx + 80);
  const slice =
    (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");

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
    if (nextHit > cursor) fragments.push({ text: slice.slice(cursor, nextHit), hit: false });
    const hitEnd = nextHit + nextToken.length;
    fragments.push({ text: slice.slice(nextHit, hitEnd), hit: true });
    cursor = hitEnd;
  }
  return fragments;
}
