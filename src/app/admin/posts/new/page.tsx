import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PostForm } from "../post-form";

export default async function NewPostPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">新建文章</h1>
      <PostForm />
    </div>
  );
}
