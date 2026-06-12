import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LifeCard, type LifePostData } from "@/components/life/LifeCard";
import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";

/**
 * 获取「当前用户」的分享列表
 *
 * 必须用 /api/life-posts/user/:userId 而不是 /api/life-posts：
 *  - 前者只查当前用户的帖子（包含 isPublic=false 的私密分享）
 *  - 后者返回全站所有公开的帖子，pagination.total 是全站统计
 */
async function getMyPosts(userId: string, page: number): Promise<{
  data: LifePostData[];
  pagination: { page: number; totalPages: number; total: number };
}> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(
    `${baseUrl}/api/life-posts/user/${userId}?page=${page}&pageSize=10`,
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
  const { data: posts, pagination } = await getMyPosts(session.user.id, page);

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

      {posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
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
