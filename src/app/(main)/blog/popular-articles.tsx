import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import Link from "next/link";

type PopularPost = {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
  likeCount: number;
};

/**
 * 获取热门文章 Top 5（服务端 fetch，ISR 缓存 5 分钟）
 */
const getPopularPosts = unstable_cache(
  async (): Promise<PopularPost[]> => {
    const posts = await prisma.post.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        likeCount: true,
      },
      orderBy: { viewCount: "desc" },
      take: 5,
    });
    return posts;
  },
  ["popular-articles"],
  { revalidate: 300, tags: ["posts"] }
);

/**
 * 热门文章侧边栏（服务端组件，直接查库不调 API）
 */
export async function PopularArticles() {
  const posts = await getPopularPosts();

  if (posts.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted-foreground))]">
        热门文章
      </h3>
      <ul className="space-y-2.5">
        {posts.map((post, i) => (
          <li key={post.id}>
            <Link
              href={`/blog/${post.slug}`}
              className="group flex items-start gap-2"
            >
              {/* 排名 */}
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold tabular-nums ${
                  i < 3
                    ? "bg-amber-bright/15 text-amber-bright"
                    : "text-[rgb(var(--muted-foreground))]"
                }`}
              >
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-[rgb(var(--foreground))] transition-colors group-hover:text-amber-bright leading-snug">
                  {post.title}
                </p>
                <span className="text-[11px] text-[rgb(var(--muted-foreground))] leading-none">
                  {formatCount(post.viewCount)} 阅读
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
