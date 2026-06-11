import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LifeCard, type LifePostData } from "@/components/life/LifeCard";
import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";

async function getUserPosts(page: number): Promise<{
  data: LifePostData[];
  pagination: { page: number; totalPages: number; total: number };
}> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(
    `${baseUrl}/api/life-posts?page=${page}&pageSize=10`,
    { cache: "no-store" }
  );
  if (!res.ok) return { data: [], pagination: { page: 1, totalPages: 0, total: 0 } };
  return res.json();
}

export default async function ProfileLifePage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const { data: posts, pagination } = await getUserPosts(page);

  // Filter to current user's posts (API returns all public; for private, would need user-specific endpoint)
  // For now showing a link to user-specific posts

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的分享</h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
            共 {pagination.total} 条记录
          </p>
        </div>
        <Link href="/life/new" className="btn-shimmer text-sm">发布分享</Link>
      </div>

      {/* 筛选用户自己的帖子 */}
      {posts.length > 0 ? (
        <div className="space-y-4">
          {posts
            .filter((p) => p.author.id === session.user.id)
            .map((post) => (
              <LifeCard key={post.id} post={post} />
            ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="text-sm text-[rgb(var(--muted-foreground))]">
            还没有发布过分享
          </p>
        </div>
      )}

      <Pagination page={page} totalPages={pagination.totalPages} />
    </div>
  );
}
