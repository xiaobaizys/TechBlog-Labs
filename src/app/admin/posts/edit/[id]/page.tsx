import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  // 通过 admin list API 获取单篇文章
  const res = await fetch(
    `${baseUrl}/api/posts/admin/list?page=1&pageSize=100`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  const { data } = await res.json();
  return (data as PostData[]).find((p) => p.id === id) ?? null;
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
