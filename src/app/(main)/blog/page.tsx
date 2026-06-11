import Link from "next/link";
import { BlogCard, type BlogCardPost } from "@/components/blog/BlogCard";
import { Pagination } from "@/components/ui/Pagination";
import { getNumberConfig } from "@/lib/config";
import { WritingHero } from "@/components/shared/WritingSection";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

// ============================================================
// 类型
// ============================================================

type TagInfo = {
  id: string;
  name: string;
  slug: string;
  postCount: number;
};

type BlogListData = {
  data: BlogCardPost[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

// ============================================================
// 数据获取（性能优化）
//   原实现：fetch('http://.../api/posts?status=PUBLISHED') 自调用
//   现实现：直接 prisma + unstable_cache(60s)，跳过一次 HTTP 往返
// ============================================================

async function getPosts(page: number, pageSize: number): Promise<BlogListData> {
  const fetcher = unstable_cache(
    async () => {
      const where = { status: "PUBLISHED" as const, deletedAt: null };
      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            coverImage: true,
            status: true,
            featured: true,
            viewCount: true,
            likeCount: true,
            publishedAt: true,
            createdAt: true,
            author: { select: { id: true, name: true, image: true } },
            tags: {
              select: { tag: { select: { id: true, name: true, slug: true } } },
            },
          },
        }),
        prisma.post.count({ where }),
      ]);
      const formatted = posts.map((post) => ({
        ...post,
        // Date → ISO 字符串（匹配 BlogCardPost 类型）
        createdAt: post.createdAt.toISOString(),
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
        tags: post.tags.map((t) => t.tag),
      }));
      return { data: formatted, total };
    },
    ["posts-list", `p${page}`, `s${pageSize}`],
    { revalidate: 60, tags: ["posts"] }
  );

  const { data, total } = await fetcher();
  return {
    data,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

async function getTags(): Promise<TagInfo[]> {
  const fetcher = unstable_cache(
    async () => {
      const tags = await prisma.tag.findMany({
        orderBy: { posts: { _count: "desc" } },
        take: 20,
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { posts: { where: { post: { status: "PUBLISHED" } } } } },
        },
      });
      return tags.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        postCount: t._count.posts,
      }));
    },
    ["tags-popular"],
    { revalidate: 300, tags: ["tags", "posts"] }
  );
  return fetcher();
}

// ============================================================
// 页面组件
// ============================================================

/**
 * SEO metadata：列表页静态 title/description
 *  - 翻页时 template 由根 layout 拼成「第 N 页 | 博客 | Site」
 *  - 留 description/keywords 给搜索引擎
 */
export const metadata = {
  title: "博客",
  description: "技术博客、笔记与思考。Next.js / React / 全栈 / 工程实践。",
  keywords: ["技术博客", "Next.js", "React", "全栈", "工程实践"],
  openGraph: {
    title: "博客 · TechBlog Labs",
    description: "技术博客、笔记与思考。",
    type: "website",
  },
};

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const pageSize = await getNumberConfig("posts_per_page", 9);

  const [{ data: posts, pagination }, tags] = await Promise.all([
    getPosts(page, pageSize),
    getTags(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 md:px-10 lg:px-20 py-16">
      {/* 页面标题（从首页"最新文章"区块迁入） */}
      <WritingHero totalCount={pagination.total} />

      <div className="flex flex-col gap-12 lg:flex-row">
        {/* ============================================================ */}
        {/* 主内容 — 文章列表 */}
        {/* ============================================================ */}
        <div className="flex-1">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg
                className="h-16 w-16 text-[rgb(var(--border))]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
              <p className="mt-4 text-[rgb(var(--muted-foreground))]">
                暂无文章
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

        {/* ============================================================ */}
        {/* 侧边栏 — 热门标签 */}
        {/* ============================================================ */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="sticky top-24">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
              热门标签
            </h3>
            {tags.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted-foreground))]">
                暂无标签
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tags/${tag.slug}`}
                    className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-xs font-medium transition-all hover:border-amber hover:text-amber-bright hover:shadow-sm"
                  >
                    {tag.name}
                    <span className="text-[rgb(var(--muted-foreground))]">
                      ({tag.postCount})
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
