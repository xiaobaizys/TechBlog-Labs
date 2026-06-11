"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProjectCard, type ProjectCardData } from "@/components/project/ProjectCard";
import { Pagination } from "@/components/ui/Pagination";

type TechStack = { name: string; count: number };

type Props = {
  initialProjects: ProjectCardData[];
  initialPage: number;
  initialTotalPages: number;
  techStacks: TechStack[];
  activeTech: string;
};

export function ProjectListClient({
  initialProjects,
  initialPage,
  initialTotalPages,
  techStacks,
  activeTech,
}: Props) {
  const router = useRouter();
  const [projects] = useState(initialProjects);
  const page = initialPage;
  const totalPages = initialTotalPages;

  function handleTechFilter(tech: string) {
    if (tech === activeTech) {
      router.push("/projects");
    } else {
      router.push(`/projects?tech=${encodeURIComponent(tech)}`);
    }
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* 侧边栏 — 技术栈筛选 */}
      <aside className="w-full shrink-0 lg:w-56">
        <div className="sticky top-24">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted-foreground))]">
            技术栈筛选
          </h3>
          <div className="flex flex-wrap gap-2 lg:flex-col">
            {activeTech && (
              <button
                onClick={() => router.push("/projects")}
                className="rounded-lg bg-amber/15 border border-amber/30 px-3 py-1.5 text-left text-xs font-medium text-amber-bright"
              >
                ✕ 清除筛选
              </button>
            )}
            {techStacks.map((s) => (
              <button
                key={s.name}
                onClick={() => handleTechFilter(s.name)}
                className={`rounded-lg px-3 py-1.5 text-left text-xs transition-all ${
                  activeTech === s.name
                    ? "bg-amber text-night shadow-amber"
                    : "border border-[rgb(var(--border))] hover:border-amber hover:text-amber-bright"
                }`}
              >
                {s.name}
                <span className="ml-1.5 opacity-60">({s.count})</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 主内容 — 项目卡片网格 */}
      <div className="flex-1">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="h-16 w-16 text-[rgb(var(--border))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="mt-4 text-sm text-[rgb(var(--muted-foreground))]">暂无项目</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination page={page} totalPages={totalPages} />
          </div>
        )}
      </div>
    </div>
  );
}
