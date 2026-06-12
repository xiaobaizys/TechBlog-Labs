"use client";

import { ProjectCard, type ProjectCardData } from "@/components/project/ProjectCard";
import { SearchBar, type SearchCategory } from "@/components/search/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { NoResults } from "@/components/search/NoResults";
import { ResultStats } from "@/components/search/ResultStats";

type Props = {
  projects: ProjectCardData[];
  pagination: { page: number; totalPages: number; total: number; pageSize: number };
  techStacks: SearchCategory[];
  activeQuery: string;
  activeTech: string;
  tookMs?: number;
};

export function ProjectSearchView({
  projects,
  pagination,
  techStacks,
  activeQuery,
  activeTech,
  tookMs,
}: Props) {
  const isSearchMode = activeQuery.length > 0 || activeTech.length > 0;
  const showHighlight = isSearchMode;

  return (
    <div className="flex flex-col gap-8">
      {/* 搜索栏 */}
      <SearchBar
        type="projects"
        placeholder="按标题、描述或正文搜索项目…"
        categories={techStacks}
        initialQuery={activeQuery}
        initialCategory={activeTech}
      />

      {/* 结果统计 */}
      <ResultStats
        total={pagination.total}
        tookMs={tookMs}
        isSearchMode={isSearchMode}
        query={activeQuery}
        category={activeTech}
        categoryLabel={techStacks.find((t) => t.value === activeTech)?.label}
      />

      {/* 结果列表 / 空态 */}
      {projects.length === 0 ? (
        isSearchMode ? (
          <NoResults
            query={activeQuery}
            category={techStacks.find((t) => t.value === activeTech)?.label}
            recommendations={techStacks.slice(0, 8).map((t) => ({
              label: t.label,
              href: `/projects?tech=${encodeURIComponent(t.value)}`,
              count: t.count,
            }))}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg
              className="h-16 w-16 text-[rgb(var(--border))]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <p className="mt-4 text-sm text-[rgb(var(--muted-foreground))]">暂无项目</p>
          </div>
        )
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} showHighlight={showHighlight} />
            ))}
          </div>
          {pagination.totalPages > 1 && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} />
          )}
        </>
      )}
    </div>
  );
}
