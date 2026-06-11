import Link from "next/link";
import Image from "next/image";

export type ProjectCardData = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string | null;
  techStack: string[];
  repoUrl: string | null;
  demoUrl: string | null;
  viewCount: number;
  likeCount: number;
  featured: boolean;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
};

export function ProjectCard({ project }: { project: ProjectCardData }) {
  return (
    <article className="theme-card-hover group flex flex-col overflow-hidden h-full">
      {/* 封面图 */}
      {project.coverImage && (
        <Link href={`/projects/${project.slug}`} className="block overflow-hidden">
          <Image
            src={project.coverImage}
            alt={project.title}
            width={800}
            height={352}
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </Link>
      )}

      <div className="flex flex-1 flex-col p-5">
        {/* 精选标记 */}
        {project.featured && (
          <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-amber/15 border border-amber/30 px-2 py-0.5 text-[10px] font-medium text-amber-bright">
            ★ 精选
          </span>
        )}

        {/* 标题 */}
        <Link href={`/projects/${project.slug}`} className="group/title">
          <h3 className="text-lg font-serif font-medium tracking-tight transition-colors group-hover/title:text-amber-bright">
            {project.title}
          </h3>
        </Link>

        {/* 描述 */}
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-[rgb(var(--muted-foreground))]">
          {project.description}
        </p>

        {/* 技术栈 */}
        {project.techStack.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.techStack.slice(0, 4).map((tech) => (
              <Link
                key={tech}
                href={`/projects?tech=${encodeURIComponent(tech)}`}
                className="rounded border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2 py-0.5 text-[10px] font-medium text-[rgb(var(--muted-foreground))] transition-colors hover:border-amber hover:text-amber-bright"
              >
                {tech}
              </Link>
            ))}
            {project.techStack.length > 4 && (
              <span className="text-[10px] text-[rgb(var(--muted-foreground))]">
                +{project.techStack.length - 4}
              </span>
            )}
          </div>
        )}

        {/* 底部统计 */}
        <div className="mt-4 flex items-center gap-4 text-xs text-[rgb(var(--muted-foreground))]">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {project.viewCount}
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {project.likeCount}
          </span>
        </div>
      </div>
    </article>
  );
}
