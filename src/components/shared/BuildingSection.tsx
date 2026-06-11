"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

/* ============================================================
   类型
   ============================================================ */

export type BuildingHeroProject = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string | null;
  techStack: string[];
};

export interface BuildingSectionProps {
  projects: BuildingHeroProject[];
  totalCount?: number;
  viewAllHref?: string;
  activeTech?: string;
}

/* ============================================================
   Hero 头部（从首页"开源项目"迁移而来）
   ============================================================ */

export function BuildingHero({
  totalCount,
  activeTech,
}: Pick<BuildingSectionProps, "totalCount" | "activeTech">) {
  return (
    <div className="mb-14">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-bright/80 font-mono mb-3 flex items-center gap-3">
        <span className="inline-block w-8 h-px bg-amber-bright/60" />
        — Building
      </p>
      <h1 className="text-3xl md:text-5xl font-serif font-medium tracking-tight text-foreground leading-[1.1]">
        开源<span className="italic text-amber-bright"> 项目 </span>
      </h1>
      <p className="mt-3 text-muted-foreground text-sm md:text-base">
        {activeTech
          ? `筛选：${activeTech}`
          : "动手把想法变成可以运行的东西"}
        {typeof totalCount === "number" && totalCount > 0 && !activeTech
          ? ` · 共 ${totalCount} 个`
          : ""}
      </p>
    </div>
  );
}

/* ============================================================
   卡片（与首页原 Building 卡片视觉一致）
   ============================================================ */

export function BuildingProjectCard({
  project,
  index = 0,
}: {
  project: BuildingHeroProject;
  index?: number;
}) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      data-cursor="hover"
      className="theme-card-hover group block overflow-hidden h-full"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {project.coverImage && (
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={project.coverImage}
            alt={project.title}
            width={400}
            height={250}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-6">
        <h3 className="font-serif font-medium text-lg mb-2 text-foreground group-hover:text-amber-bright transition-colors">
          {project.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {project.description}
        </p>
        {project.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.techStack.slice(0, 4).map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber/10 text-amber-bright border border-amber/20"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

/* ============================================================
   完整 Building 区块
   ============================================================ */

export function BuildingSection({
  projects,
  totalCount,
  viewAllHref = "/projects",
}: BuildingSectionProps) {
  return (
    <section className="vitalog-section px-5 md:px-10 lg:px-20 py-24">
      <BuildingHero totalCount={totalCount} />

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {projects.map((project, i) => (
            <BuildingProjectCard
              key={project.id}
              project={project}
              index={i}
            />
          ))}
        </div>
      ) : (
        <div className="vitalog-empty text-center py-16 text-muted-foreground max-w-6xl mx-auto">
          <p className="text-sm">暂无项目</p>
        </div>
      )}

      <div className="text-center mt-12">
        <Link
          href={viewAllHref}
          data-cursor="hover"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-amber transition-colors group"
        >
          查看全部项目
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

export default BuildingSection;
