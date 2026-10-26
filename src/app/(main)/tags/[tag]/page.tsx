import { notFound } from "next/navigation";
import Link from "next/link";
import { BlogCard, type BlogCardPost } from "@/components/blog/BlogCard";
import { Pagination } from "@/components/ui/Pagination";

/**
 * 标签页 SEO：title 用「#标签名」拼接站点名
 *  - 标签不存在时由 notFound() 兜住，metadata 走通用 title
 */
export async function generateMetadata({ params }: { params: { tag: string } }) {
  // 解码兼容中文 / emoji 标签
  let tagSlug = params.tag;
  try {
    const decoded = decodeURIComponent(params.tag);
    if (decoded !== params.tag) tagSlug = decoded;
  } catch { /* leave as is */ }

  return {
    title: `#${tagSlug}`,
    description: `所有标签为「${tagSlug}」的文章。`,
    openGraph: {
      title: `#${tagSlug} · TechBlog Labs`,
      description: `所有标签为「${tagSlug}」的文章。`,
      type: "website",
    },
  };
}

// ============================================================
// 类型
// ============================================================

type TagPageData = {
  tag: { id: string; name: string; slug: string };
  posts: BlogCardPost[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

// ============================================================
// 数据获取
// ============================================================

async function getTagPosts(
  tag: string,
  page: number
): Promise<{ success: boolean; data?: TagPageData; message?: string }> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(
    `${baseUrl}/api/tags/${tag}/posts?page=${page}&pageSize=9`,
    { cache: "no-store" }
  );
  return res.json();
}

// ============================================================
// 页面组件
// ============================================================

export default async function TagPostsPage({
  params,
  searchParams,
}: {
  params: { tag: string };
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const result = await getTagPosts(params.tag, page);

  if (!result.success || !result.data) {
    notFound();
  }

  const { tag, posts, pagination } = result.data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* 页面标题 */}
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <Link
            href="/blog"
            className="text-sm text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] transition-colors"
          >
            ← 返回博客
          </Link>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          <span className="gradient-text">{tag.name}</span>
        </h1>
        <p className="mt-2 text-[rgb(var(--muted-foreground))]">
          共 {pagination.total} 篇文章
        </p>
      </div>

      {/* 文章列表 */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[rgb(var(--muted-foreground))]">
            该标签下暂无文章
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={pagination.totalPages} />
    </div>
  );
}
