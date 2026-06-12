import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import type { ProjectCardData } from "@/components/project/ProjectCard";
import { BuildingHero } from "@/components/shared/BuildingSection";
import {
  buildProjectKeywordWhere,
  buildProjectTitleWhere,
  safePage,
  tokenize,
} from "@/lib/search";
import { ProjectSearchView } from "@/components/project/ProjectSearchView";
import type { SearchCategory } from "@/components/search/SearchBar";

type TechStack = { name: string; count: number };

/* ----------------------------------------------------------------
 * 性能优化：原实现是 server component 内 `fetch('http://.../api/projects')`
 * 自调用 HTTP，会多一次序列化 + 网络 + Next.js middleware 开销。
 * 现改为：直接 prisma 查询 + unstable_cache（30s 过期），同样的并发能力
 * 但跳过 HTTP 往返。
 * ---------------------------------------------------------------- */
async function getProjects(page: number, tech?: string): Promise<{
  data: ProjectCardData[];
  pagination: { page: number; totalPages: number; total: number };
}> {
  // 序列化 tech 作为 cache key 的一部分；不同筛选各自独立缓存
  const fetcher = unstable_cache(
    async () => {
      const where: { isPublic: true; techStack?: { has: string } } = { isPublic: true };
      if (tech) where.techStack = { has: tech };

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          orderBy: [
            { featured: "desc" },
            { sortOrder: "asc" },
            { createdAt: "desc" },
          ],
          skip: (page - 1) * 6,
          take: 6,
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
      // Date → ISO 字符串 + description 兜底（匹配 ProjectCardData 类型）
      const data = projects.map((p) => ({
        ...p,
        description: p.description ?? "",
        createdAt: p.createdAt.toISOString(),
        highlight: null as { text: string; hit: boolean }[] | null,
      }));
      return { data, total };
    },
    ["projects-list", `p${page}`, tech ?? "all"],
    { revalidate: 30, tags: ["projects"] }
  );

  const { data, total } = await fetcher();
  return {
    data,
    pagination: { page, totalPages: Math.max(1, Math.ceil(total / 6)), total },
  };
}

/**
 * searchProjects · 服务端搜索（与 /api/search/projects 等价但省去 HTTP 往返）
 *  - 关键词全文（title / description / content）+ tech 过滤 + title 过滤
 *  - 返回带 highlight 片段的 ProjectCardData[]
 */
async function searchProjects(
  q: string | null,
  tech: string | null,
  title: string | null,
  page: number
): Promise<{
  data: ProjectCardData[];
  pagination: { page: number; totalPages: number; total: number };
  tookMs: number;
}> {
  const t0 = Date.now();
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
      skip: (page - 1) * 6,
      take: 6,
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
    description: p.description ?? "",
    createdAt: p.createdAt.toISOString(),
    highlight: buildHighlight(p.description ?? "", p.title, tokens),
  }));

  return {
    data,
    pagination: { page, totalPages: Math.max(1, Math.ceil(total / 6)), total },
    tookMs: Date.now() - t0,
  };
}

async function getTechStacks(): Promise<TechStack[]> {
  const fetcher = unstable_cache(
    async () => {
      // 统计公开项目里所有技术栈出现次数
      const rows = await prisma.project.findMany({
        where: { isPublic: true },
        select: { techStack: true },
      });
      const counter = new Map<string, number>();
      for (const r of rows) {
        for (const t of r.techStack) counter.set(t, (counter.get(t) ?? 0) + 1);
      }
      return Array.from(counter.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
    ["projects-tech-stacks"],
    { revalidate: 300, tags: ["projects", "tech-stacks"] }
  );
  return fetcher();
}

// ============================================================
// SEO metadata
// ============================================================

/**
 * 项目列表 SEO：保持与博客一致的字段风格
 */
export const metadata = {
  title: "项目",
  description: "个人项目 / 实验 / 作品集。代码与构建思路。",
  keywords: ["项目", "作品集", "实验", "Next.js", "全栈"],
  openGraph: {
    title: "项目 · TechBlog Labs",
    description: "个人项目 / 实验 / 作品集。",
    type: "website",
  },
};

// ============================================================
// 页面
// ============================================================

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { page?: string; tech?: string; q?: string; title?: string };
}) {
  const session = await auth();
  void session; // 预留：未来可能给 ADMIN 显示「私密项目」开关
  const page = safePage(searchParams.page ?? "1", 1);
  const tech = (searchParams.tech ?? "").trim();
  const q = (searchParams.q ?? "").trim();
  const title = (searchParams.title ?? "").trim();
  const isSearch = q.length > 0 || tech.length > 0 || title.length > 0;

  const [dataBundle, techStacks] = await Promise.all([
    isSearch
      ? searchProjects(q || null, tech || null, title || null, page).then((r) => ({
          ...r,
          pageSize: 6,
        }))
      : getProjects(page, tech || undefined).then((r) => ({
          ...r,
          pageSize: 6,
          tookMs: 0,
        })),
    getTechStacks(),
  ]);

  // 搜索栏分类下拉
  const categories: SearchCategory[] = techStacks.map((t) => ({
    value: t.name,
    label: t.name,
    count: t.count,
  }));

  return (
    <div className="mx-auto max-w-6xl px-5 md:px-10 lg:px-20 py-16">
      {/* 页面标题（从首页"开源项目"区块迁入） */}
      <BuildingHero totalCount={dataBundle.pagination.total} activeTech={tech} />

      <ProjectSearchView
        projects={dataBundle.data}
        pagination={{ ...dataBundle.pagination, pageSize: dataBundle.pageSize }}
        techStacks={categories}
        activeQuery={q}
        activeTech={tech}
        tookMs={dataBundle.tookMs}
      />
    </div>
  );
}

// ============================================================
// 与 /api/search/projects 同步的 highlight 计算
// ============================================================
function buildHighlight(
  source: string,
  title: string,
  tokens: string[]
): { text: string; hit: boolean }[] | null {
  if (tokens.length === 0) return null;
  const text = source || title;
  if (!text) return null;
  const lc = text.toLowerCase();
  let firstIdx = -1;
  for (const t of tokens) {
    const i = lc.indexOf(t.toLowerCase());
    if (i >= 0 && (firstIdx === -1 || i < firstIdx)) firstIdx = i;
  }
  if (firstIdx === -1) {
    return [{ text: text.slice(0, 160), hit: false }];
  }
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
