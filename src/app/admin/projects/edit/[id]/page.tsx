import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "../../project-form";

// 直接用 Prisma 查 DB（避免服务端 fetch 自家 API 缺 cookie）
async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    select: {
      id: true, title: true, slug: true, description: true,
      content: true, coverImage: true, techStack: true,
      repoUrl: true, demoUrl: true, downloadUrl: true, sourceFilePath: true,
      isPublic: true, featured: true, sortOrder: true,
    },
  });
}

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const project = await getProject(params.id);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold">编辑项目</h1>
      <ProjectForm
        initialData={{
          id: project.id,
          title: project.title,
          description: project.description,
          content: project.content ?? "",
          coverImage: project.coverImage ?? "",
          techStack: project.techStack,
          repoUrl: project.repoUrl ?? "",
          demoUrl: project.demoUrl ?? "",
          downloadUrl: project.downloadUrl ?? "",
          sourceFilePath: project.sourceFilePath ?? "",
          isPublic: project.isPublic,
          featured: project.featured,
        }}
      />
    </div>
  );
}
