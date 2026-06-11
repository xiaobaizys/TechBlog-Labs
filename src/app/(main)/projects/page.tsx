import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { ProjectListClient } from "./project-list-client";
import type { ProjectCardData } from "@/components/project/ProjectCard";
import { BuildingHero } from "@/components/shared/BuildingSection";

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
  searchParams: { page?: string; tech?: string };
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const tech = searchParams.tech;

  const [{ data: projects, pagination }, techStacks] = await Promise.all([
    getProjects(page, tech),
    getTechStacks(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 md:px-10 lg:px-20 py-16">
      {/* 页面标题（从首页"开源项目"区块迁入） */}
      <BuildingHero totalCount={pagination.total} activeTech={tech} />

      <ProjectListClient
        initialProjects={projects}
        initialPage={page}
        initialTotalPages={pagination.totalPages}
        techStacks={techStacks}
        activeTech={tech ?? ""}
      />
    </div>
  );
}
