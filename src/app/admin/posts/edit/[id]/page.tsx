import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PostForm } from "../../post-form";

type PostData = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  status: string;
  featured: boolean;
  tags: { id: string; name: string; slug: string }[];
};

async function getPost(id: string): Promise<PostData | null> {
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      excerpt: true,
      coverImage: true,
      status: true,
      featured: true,
      tags: {
        select: { tag: { select: { id: true, name: true, slug: true } } },
      },
    },
  });
  if (!post) return null;
  return { ...post, tags: post.tags.map((t) => t.tag) };
}

export default async function EditPostPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const post = await getPost(params.id);
  if (!post) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">编辑文章</h1>
      <PostForm
        initialData={{
          id: post.id,
          title: post.title,
          content: post.content,
          excerpt: post.excerpt ?? "",
          coverImage: post.coverImage ?? "",
          tags: post.tags.map((t) => t.name),
          status: post.status,
          featured: post.featured,
        }}
      />
    </div>
  );
}
