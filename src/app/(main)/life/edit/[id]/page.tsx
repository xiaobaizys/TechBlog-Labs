import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LifeForm } from "../../life-form";

async function getLifePost(id: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/life-posts/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

export default async function EditLifePostPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const post = await getLifePost(params.id);
  if (!post) notFound();

  const isOwner = session.user.id === post.author.id;
  const isAdminRole = session.user.role === "ADMIN";
  if (!isOwner && !isAdminRole) redirect("/life");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-bold">编辑分享</h1>
      <LifeForm
        initialData={{
          id: post.id,
          content: post.content,
          images: post.images,
          isPublic: post.isPublic,
        }}
      />
    </div>
  );
}
