import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectActions } from "./project-actions";

// 直接用 Prisma 查 DB（避免服务端 fetch 自家 API 缺 cookie）
async function getProjects() {
  return prisma.project.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, title: true, slug: true, description: true,
      techStack: true, viewCount: true, likeCount: true,
      isPublic: true, featured: true, createdAt: true, updatedAt: true,
      author: { select: { id: true, name: true } },
    },
  });
}

export default async function AdminProjectsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const projects = await getProjects();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">项目管理</h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">共 {projects.length} 个项目</p>
        </div>
        <Link href="/admin/projects/new" className="btn-shimmer text-sm">新建项目</Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[rgb(var(--border))] p-12 text-center">
          <p className="text-sm text-[rgb(var(--muted-foreground))]">暂无项目</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[rgb(var(--border))]">
          <table className="w-full text-sm">
            <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))] text-left">
              <tr>
                <th className="px-4 py-3 font-medium">项目名称</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">技术栈</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">浏览/点赞</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">更新日期</th>
                <th className="px-4 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {projects.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-[rgb(var(--muted))]/50">
                  <td className="px-4 py-3">
                    <div className="max-w-xs">
                      <span className="font-medium">{p.title}</span>
                      {p.featured && <span className="ml-1.5 text-xs text-amber-500">★</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {p.techStack.slice(0, 3).map((t) => (
                        <span key={t} className="rounded border border-[rgb(var(--border))] px-1.5 py-0.5 text-xs text-[rgb(var(--muted-foreground))]">{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.isPublic ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">公开</span>
                    ) : (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">私密</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-[rgb(var(--muted-foreground))]">{p.viewCount} / {p.likeCount}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-[rgb(var(--muted-foreground))]">{p.updatedAt.toLocaleDateString("zh-CN")}</td>
                  <td className="px-4 py-3 text-right">
                    <ProjectActions id={p.id} title={p.title} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
