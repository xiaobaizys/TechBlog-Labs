import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MDXContent } from "@/lib/mdx";
import { ProjectDetailClient } from "./project-detail-client";
import { UserAvatar } from "@/components/user/UserAvatar";
import {
  ArrowLeft, Eye, Calendar, ExternalLink, Globe, Download, Edit3,
  FileText, Star, Code2, Clock, BookOpen, MessageCircle, GitFork, Bookmark,
} from "lucide-react";

// 项目详情页访问项目数据库，必须每次实时渲染
export const dynamic = "force-dynamic";

/* ========================================================================
 * GitHub 品牌图标（lucide 不含品牌图标，用内联 SVG）
 * ====================================================================== */
function GithubIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

type ProjectData = {
  id: string; title: string; slug: string; description: string;
  content: string | null; coverImage: string | null; techStack: string[];
  repoUrl: string | null; demoUrl: string | null; downloadUrl: string | null;
  viewCount: number; likeCount: number; isPublic: boolean; isLiked: boolean;
  featured: boolean;
  createdAt: string; updatedAt: string;
  author: { id: string; name: string | null; image: string | null };
};

/**
 * 直接用 prisma 取项目详情（不走 HTTP fetch，避免 server 内部自调用 + 序列化 + 网络开销）
 *
 * 同时支持 id 和 slug 两种 URL
 * 顺便 viewCount+1
 */
async function getProject(idOrSlug: string, userId?: string): Promise<ProjectData | null> {
  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: {
        id: true, title: true, slug: true, description: true, content: true,
        coverImage: true, techStack: true, repoUrl: true, demoUrl: true, downloadUrl: true,
        viewCount: true, likeCount: true, isPublic: true, featured: true,
        createdAt: true, updatedAt: true,
        author: { select: { id: true, name: true, image: true } },
        ...(userId
          ? { likes: { where: { userId }, select: { id: true } } }
          : {}),
      },
    });

    if (!project) return null;

    // 私有项目仅管理员可见
    if (!project.isPublic) {
      const isAdmin = (await prisma.user.findUnique({
        where: { id: userId ?? "" },
        select: { role: true },
      }))?.role === "ADMIN";
      if (!isAdmin) return null;
    }

    // 计数 +1
    await prisma.project.update({
      where: { id: project.id },
      data: { viewCount: { increment: 1 } },
    });
    const { likes, ...rest } = project as typeof project & { likes?: { id: string }[] };
    return {
      ...rest,
      viewCount: rest.viewCount + 1,
      isLiked: likes ? likes.length > 0 : false,
      createdAt: rest.createdAt.toISOString(),
      updatedAt: rest.updatedAt.toISOString(),
    };
  } catch (err) {
    console.error("[getProject]", err);
    return null;
  }
}

/**
 * 详情页 SEO：仅取元数据（不 +1 view），避免与页面渲染重复计数
 *  - 标题 / 描述：项目自带字段，没有就 fallback 到空
 *  - OG 图：项目封面
 *  - 项目不存在时返回通用 title，notFound() 兜住
 */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  try {
    // 解码 slug 兼容中文/emoji
    let idOrSlug = params.id;
    try {
      const decoded = decodeURIComponent(params.id);
      if (decoded !== params.id) idOrSlug = decoded;
    } catch { /* leave as is */ }

    const project = await prisma.project.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: { title: true, description: true, coverImage: true },
    });
    if (!project) return { title: "项目不存在" };

    return {
      title: project.title,
      description: project.description || undefined,
      openGraph: {
        title: project.title,
        description: project.description || undefined,
        images: project.coverImage ? [project.coverImage] : [],
        type: "article",
      },
    };
  } catch {
    return { title: "项目" };
  }
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  // Next.js 14 的 params 在某些场景不会自动 decode 含特殊字符（含 emoji）的 slug
  // 这里手动 decodeURIComponent 兜底，确保中文/emoji slug 能正确匹配数据库
  let idOrSlug = params.id;
  try {
    const decoded = decodeURIComponent(params.id);
    if (decoded !== params.id) idOrSlug = decoded;
  } catch {
    /* 已经是原始字符串，忽略 */
  }
  const project = await getProject(idOrSlug, session?.user?.id);
  if (!project) notFound();

  const isAdmin = session?.user?.role === "ADMIN";
  const createdDate = new Date(project.createdAt);
  const updatedDate = new Date(project.updatedAt);
  const wasUpdated = project.updatedAt !== project.createdAt;

  const dateFmt = (d: Date) =>
    d.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-6">
      {/* ====================================================================
       *  顶部工具栏（面包屑 + 管理员操作）
       * ================================================================== */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-[rgb(var(--muted-foreground))] hover:text-amber-bright transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回项目列表
        </Link>
        {isAdmin && (
          <Link
            href={`/admin/projects/edit/${project.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            管理后台编辑
          </Link>
        )}
      </div>

      {/* ====================================================================
       *  HEADER 区（仿 GitHub/Gitee 顶部：项目名 + 状态 + 简介 + 操作）
       * ================================================================== */}
      <header className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm overflow-hidden">
        {/* 顶部装饰条：使用 cover 缩略图或渐变 */}
        <div className="relative h-24 md:h-28 overflow-hidden">
          {project.coverImage ? (
            <>
              <Image
                src={project.coverImage}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-[rgb(var(--card))]" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-amber/30 via-amber/10 to-sky-500/20" />
              <div
                className="absolute inset-0 opacity-25 text-[rgb(var(--muted-foreground))]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                  backgroundSize: "18px 18px",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgb(var(--card))]" />
            </>
          )}
        </div>

        {/* 标题 + Meta + 操作 */}
        <div className="px-5 md:px-7 -mt-10 md:-mt-12 relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            {/* 左：项目名 + 徽章 */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl md:text-3xl lg:text-[32px] font-semibold tracking-tight leading-tight text-[rgb(var(--foreground))]">
                  {project.title}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    project.isPublic
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-amber/30 bg-amber/15 text-amber-bright"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      project.isPublic ? "bg-emerald-500" : "bg-amber-bright"
                    }`}
                  />
                  {project.isPublic ? "Public" : "Private"}
                </span>
                {project.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber/40 bg-amber/15 px-2 py-0.5 text-[11px] font-medium text-amber-bright">
                    <Star className="h-3 w-3 fill-amber-bright" />
                    Featured
                  </span>
                )}
              </div>

              {/* 作者行 + 时间 */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[rgb(var(--muted-foreground))]">
                {project.author.name && (
                  <Link
                    href={`/profile?userId=${project.author.id}`}
                    className="inline-flex items-center gap-1.5 hover:text-amber-bright transition-colors"
                  >
                    <UserAvatar
                      name={project.author.name}
                      image={project.author.image}
                      userId={project.author.id}
                      size="xs"
                    />
                    <span className="font-medium">{project.author.name}</span>
                  </Link>
                )}
                <span className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <time dateTime={project.createdAt}>{dateFmt(createdDate)}</time>
                </span>
                {wasUpdated && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      更新于 <time dateTime={project.updatedAt}>{dateFmt(updatedDate)}</time>
                    </span>
                  </>
                )}
              </div>

              {/* 描述 */}
              {project.description && (
                <p className="mt-3 text-[15px] leading-relaxed text-[rgb(var(--muted-foreground))] max-w-3xl">
                  {project.description}
                </p>
              )}
            </div>

            {/* 右：操作按钮组（仿 GitHub Watch/Star/Fork） */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {project.repoUrl && (
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-1.5 text-sm font-medium transition-all hover:border-amber hover:text-amber-bright"
                  title="查看源代码仓库"
                >
                  <GithubIcon className="h-4 w-4" />
                  <span>Code</span>
                </a>
              )}
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-1.5 text-sm font-medium transition-all hover:border-amber hover:text-amber-bright"
                  title="在线演示"
                >
                  <Globe className="h-4 w-4" />
                  <span>Demo</span>
                </a>
              )}
              {project.downloadUrl && (
                <a
                  href={project.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-1.5 text-sm font-medium transition-all hover:border-amber hover:text-amber-bright"
                  title="下载源码包"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </a>
              )}
              <div className="h-6 w-px bg-[rgb(var(--border))] mx-0.5 hidden sm:block" />
              <ProjectDetailClient
                projectId={project.id}
                initialLiked={project.isLiked}
                initialLikeCount={project.likeCount}
                isLoggedIn={!!session?.user}
              />
            </div>
          </div>

          {/* Tech Stack Pills（仿 GitHub Topics） */}
          {project.techStack.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-1.5 pb-5">
              <span className="text-[11px] uppercase tracking-wider text-[rgb(var(--muted-foreground))] font-semibold mr-1">
                Tech:
              </span>
              {project.techStack.map((tech) => (
                <Link
                  key={tech}
                  href={`/projects?tech=${encodeURIComponent(tech)}`}
                  className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-2.5 py-0.5 text-xs font-medium hover:border-amber hover:text-amber-bright transition-colors"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                  {tech}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ====================================================================
       *  Tabs 栏（仿 GitHub: Code/Issues/...）
       * ================================================================== */}
      <nav className="mt-6 border-b border-[rgb(var(--border))] overflow-x-auto">
        <ul className="flex items-center gap-0 -mb-px min-w-max">
          <TabItem icon={BookOpen} active count={null}>
            Overview
          </TabItem>
          <TabItem icon={FileText} count={null}>
            README
          </TabItem>
          <TabItem icon={MessageCircle} count={null}>
            评论
          </TabItem>
          <TabItem icon={GitFork} count={null}>
            Forks
          </TabItem>
          <TabItem icon={Bookmark} count={null}>
            Releases
          </TabItem>
        </ul>
      </nav>

      {/* ====================================================================
       *  两栏布局：主内容 + 侧边栏
       * ================================================================== */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        {/* ====== 主内容区 ====== */}
        <main className="min-w-0 space-y-6">
          {/* 概览卡片（仿 GitHub About 顶部） */}
          <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber to-amber-bright text-night shadow-amber">
                <Code2 className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-lg font-semibold">项目概览</h2>
                <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
                  {project.description || "这个项目还没有简介"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[rgb(var(--muted-foreground))]">
                  <span className="inline-flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    <strong className="text-[rgb(var(--foreground))] font-semibold">
                      {project.viewCount}
                    </strong>{" "}
                    浏览
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 fill-amber-bright text-amber-bright" />
                    <strong className="text-[rgb(var(--foreground))] font-semibold">
                      {project.likeCount}
                    </strong>{" "}
                    收藏
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <strong className="text-[rgb(var(--foreground))] font-semibold">
                      {dateFmt(createdDate)}
                    </strong>{" "}
                    创建
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* README 区 */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 font-serif text-lg font-semibold">
                <FileText className="h-4 w-4 text-amber-bright" />
                README
              </h2>
              {isAdmin && !project.content && (
                <Link
                  href={`/admin/projects/edit/${project.id}`}
                  className="text-xs text-amber-bright hover:underline inline-flex items-center gap-1"
                >
                  <Edit3 className="h-3 w-3" /> 写点什么
                </Link>
              )}
            </div>
            {project.content ? (
              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 md:p-8">
                <MDXContent source={project.content} />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card))] p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--muted))]">
                  <FileText className="h-6 w-6 text-[rgb(var(--muted-foreground))] opacity-60" />
                </div>
                <p className="mt-3 text-sm text-[rgb(var(--muted-foreground))]">
                  该项目还没有详细介绍
                </p>
                {isAdmin && (
                  <Link
                    href={`/admin/projects/edit/${project.id}`}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber px-3.5 py-1.5 text-sm font-medium text-night hover:bg-amber-bright transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    去添加 README
                  </Link>
                )}
              </div>
            )}
          </section>
        </main>

        {/* ====== 侧边栏 ====== */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {/* About */}
          <SidebarCard title="About">
            {project.description ? (
              <p className="text-sm leading-relaxed text-[rgb(var(--muted-foreground))]">
                {project.description}
              </p>
            ) : (
              <p className="text-sm italic text-[rgb(var(--muted-foreground))]">
                暂无简介
              </p>
            )}
            <SidebarDivider />
            <SidebarMeta icon={Eye} label="浏览">
              <span className="font-semibold text-[rgb(var(--foreground))]">
                {project.viewCount}
              </span>
            </SidebarMeta>
            <SidebarMeta icon={Star} label="收藏">
              <span className="font-semibold text-[rgb(var(--foreground))]">
                {project.likeCount}
              </span>
            </SidebarMeta>
            <SidebarMeta icon={Calendar} label="创建">
              <span>{dateFmt(createdDate)}</span>
            </SidebarMeta>
            {wasUpdated && (
              <SidebarMeta icon={Clock} label="更新">
                <span>{dateFmt(updatedDate)}</span>
              </SidebarMeta>
            )}
          </SidebarCard>

          {/* 技术栈（带进度条） */}
          {project.techStack.length > 0 && (
            <SidebarCard title="技术栈">
              <div className="space-y-2">
                {project.techStack.map((tech, i) => (
                  <Link
                    key={tech}
                    href={`/projects?tech=${encodeURIComponent(tech)}`}
                    className="group block"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: TECH_COLORS[i % TECH_COLORS.length] }}
                        />
                        <span className="font-medium group-hover:text-amber-bright transition-colors">
                          {tech}
                        </span>
                      </span>
                      <span className="text-[rgb(var(--muted-foreground))]">
                        {pseudoPercent(project.techStack.length, i)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--muted))]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pseudoPercent(project.techStack.length, i)}%`,
                          backgroundColor: TECH_COLORS[i % TECH_COLORS.length],
                          opacity: 0.8,
                        }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </SidebarCard>
          )}

          {/* 链接 */}
          {(project.repoUrl || project.demoUrl || project.downloadUrl) && (
            <SidebarCard title="链接">
              <ul className="space-y-1">
                {project.repoUrl && (
                  <SidebarLinkItem
                    href={project.repoUrl}
                    icon={<GithubIcon className="h-4 w-4" />}
                    label="源代码"
                  />
                )}
                {project.demoUrl && (
                  <SidebarLinkItem
                    href={project.demoUrl}
                    icon={<Globe className="h-4 w-4" />}
                    label="在线演示"
                  />
                )}
                {project.downloadUrl && (
                  <SidebarLinkItem
                    href={project.downloadUrl}
                    icon={<Download className="h-4 w-4" />}
                    label="下载源码包"
                  />
                )}
              </ul>
            </SidebarCard>
          )}

          {/* 作者 */}
          {project.author.name && (
            <SidebarCard title="作者">
              <Link
                href={`/profile?userId=${project.author.id}`}
                className="group flex items-center gap-3 -m-1 p-1 rounded-lg hover:bg-[rgb(var(--background))] transition-colors"
              >
                <UserAvatar
                  name={project.author.name}
                  image={project.author.image}
                  userId={project.author.id}
                  size="md"
                  ring
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold group-hover:text-amber-bright transition-colors">
                    {project.author.name}
                  </p>
                  <p className="text-xs text-[rgb(var(--muted-foreground))]">
                    查看个人主页 →
                  </p>
                </div>
              </Link>
            </SidebarCard>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ========================================================================
 * 固定调色板（用于技术栈进度条）
 * ====================================================================== */
const TECH_COLORS = [
  "#F2A65A", // amber
  "#FFB86C", // amber-bright
  "#60A5FA", // blue
  "#34D399", // emerald
  "#F472B6", // pink
  "#A78BFA", // violet
  "#FBBF24", // yellow
  "#22D3EE", // cyan
];

/**
 * 伪百分比：根据 techStack 数量 + 位置生成一个看起来真实的占比
 * （没有真实统计数据，仅用于视觉占位）
 */
function pseudoPercent(total: number, idx: number): number {
  if (total === 1) return 100;
  // 简单分布：第一项最大，后面递减
  const weights = Array.from({ length: total }, (_, i) => Math.max(1, total - i));
  const sum = weights.reduce((a, b) => a + b, 0);
  return Math.round((weights[idx] / sum) * 100);
}

/* ========================================================================
 * 小工具组件
 * ====================================================================== */
function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted-foreground))]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function SidebarDivider() {
  return <div className="my-3 h-px bg-[rgb(var(--border))]" />;
}

function SidebarMeta({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-sm">
      <span className="inline-flex items-center gap-1.5 text-[rgb(var(--muted-foreground))]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-[rgb(var(--muted-foreground))]">{children}</span>
    </div>
  );
}

function SidebarLinkItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-[rgb(var(--background))] transition-colors"
      >
        <span className="text-[rgb(var(--muted-foreground))] group-hover:text-amber-bright">
          {icon}
        </span>
        <span className="truncate group-hover:text-amber-bright">{label}</span>
        <ExternalLink className="ml-auto h-3 w-3 shrink-0 opacity-40 group-hover:opacity-100" />
      </a>
    </li>
  );
}

function TabItem({
  icon: Icon,
  active = false,
  count,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  count?: number | null;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        className={`relative inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "border-amber-bright text-[rgb(var(--foreground))]"
            : "border-transparent text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:border-[rgb(var(--border))]"
        }`}
      >
        <Icon className="h-4 w-4" />
        {children}
        {count !== null && count !== undefined && (
          <span className="ml-1 rounded-full bg-[rgb(var(--muted))] px-1.5 py-0.5 text-[10px] font-semibold">
            {count}
          </span>
        )}
      </button>
    </li>
  );
}
