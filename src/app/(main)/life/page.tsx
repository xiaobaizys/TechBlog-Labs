import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { LifeFeed } from "./life-feed";

// ============================================================
// 类型
// ============================================================

type LifePostData = {
  id: string;
  content: string;
  images: string[];
  likeCount: number;
  isPublic: boolean;
  isLiked: boolean;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
};

/* ----------------------------------------------------------------
 * 性能优化：原实现 server component 内 fetch 自调 HTTP，
 * 现改为 prisma + unstable_cache。
 *
 * 注意：isLiked 依赖 user，每用户不同；这里只缓存公共部分（不含 isLiked），
 * 然后在 caller 处用当前 userId 二次过滤组合。
 * ---------------------------------------------------------------- */
async function getLifePostsPage(
  page: number,
  userId: string | undefined
): Promise<{ data: LifePostData[]; pagination: { page: number; totalPages: number } }> {
  // 公共列表（不含 isLiked），缓存 30s
  const fetchPublic = unstable_cache(
    async () => {
      const where = { isPublic: true };
      const [posts, total] = await Promise.all([
        prisma.lifePost.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * 10,
          take: 10,
          select: {
            id: true,
            content: true,
            images: true,
            likeCount: true,
            isPublic: true,
            createdAt: true,
            author: { select: { id: true, name: true, image: true } },
          },
        }),
        prisma.lifePost.count({ where }),
      ]);
      return { posts, total };
    },
    ["life-posts-list", `p${page}`],
    { revalidate: 30, tags: ["life-posts"] }
  );

  const { posts, total } = await fetchPublic();

  // 用户私人点赞状态（实时；不缓存）
  let likedIdSet = new Set<string>();
  if (userId && posts.length > 0) {
    const likes = await prisma.lifeLike.findMany({
      where: {
        userId,
        lifePostId: { in: posts.map((p) => p.id) },
      },
      select: { lifePostId: true },
    });
    likedIdSet = new Set(likes.map((l) => l.lifePostId));
  }

  return {
    data: posts.map((post) => ({
      id: post.id,
      content: post.content,
      images: post.images,
      likeCount: post.likeCount,
      isPublic: post.isPublic,
      isLiked: likedIdSet.has(post.id),
      // unstable_cache 序列化后 Date 会变 string；两者都兼容
      createdAt:
        post.createdAt instanceof Date
          ? post.createdAt.toISOString()
          : (post.createdAt as unknown as string),
      author: post.author,
    })),
    pagination: { page, totalPages: Math.max(1, Math.ceil(total / 10)) },
  };
}

// ============================================================
// 页面
// ============================================================

/**
 * 生活流 SEO：搜索权重低，主要给社交分享卡片用
 */
export const metadata = {
  title: "生息",
  description: "日常记录、随笔、碎碎念。",
  openGraph: {
    title: "生息 · TechBlog Labs",
    description: "日常记录、随笔、碎碎念。",
    type: "website",
  },
  // 私密内容不索引
  robots: { index: false, follow: true },
};

export default async function LifePage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await auth();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const { data: posts, pagination } = await getLifePostsPage(page, session?.user?.id);

  return (
    <div className="mx-auto max-w-2xl px-5 md:px-10 py-16">
      {/* 标题栏 */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-bright/80 font-mono mb-3 flex items-center gap-3">
            <span className="inline-block w-8 h-px bg-amber-bright/60" />
            — Life
          </p>
          <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-foreground">
            生活碎片
          </h1>
          <p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">
            记录日常的点滴与灵感
          </p>
        </div>
        {session?.user && (
          <Link href="/life/new" className="btn-amber text-sm">
            发布分享
          </Link>
        )}
      </div>

      {/* 内容 */}
      <LifeFeed
        initialPosts={posts}
        initialPage={page}
        initialTotalPages={pagination.totalPages}
      />
    </div>
  );
}
