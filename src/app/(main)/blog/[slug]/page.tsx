import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MDXContent, extractToc, type TocEntry } from "@/lib/mdx";
import { LikeButton } from "./like-button";
import { ReadingProgress } from "./reading-progress";
import { UserAvatar } from "@/components/user/UserAvatar";
import { getNumberConfig, getBoolConfig } from "@/lib/config";
import { ArrowLeft, Edit3 } from "lucide-react";

// 延迟加载评论区（首屏不可见 · 减少初始 JS 体积）
const CommentSection = dynamic(
  () =>
    import("@/components/comments/CommentSection").then(
      (m) => m.CommentSection
    ),
  {
    ssr: false,
    loading: () => (
      <div className="mt-12 animate-pulse rounded-xl border border-dashed border-[rgb(var(--border))] p-8 text-center">
        <p className="text-sm text-[rgb(var(--muted-foreground))]">加载评论…</p>
      </div>
    ),
  }
);

// 延迟加载桌面端 TOC 侧边栏
const TocSidebar = dynamic(
  () => import("./toc-sidebar").then((m) => m.TocSidebar),
  { ssr: false }
);

// ============================================================
// 类型
// ============================================================

type PostData = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  status: string;
  featured: boolean;
  viewCount: number;
  likeCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  tags: { id: string; name: string; slug: string }[];
  commentCount: number;
  isLiked: boolean;
};

// ============================================================
// 数据获取（缓存 60s · 减少 generateMetadata + 页面组件的重复查库）
// ============================================================

const getCachedPost = unstable_cache(
  async (slug: string) => {
    return prisma.post.findUnique({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        coverImage: true,
        status: true,
        featured: true,
        viewCount: true,
        likeCount: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, image: true } },
        tags: {
          select: { tag: { select: { id: true, name: true, slug: true } } },
        },
        _count: { select: { comments: true } },
      },
    });
  },
  ["post-by-slug"],
  { revalidate: 60, tags: ["posts"] }
);

async function getPost(
  slug: string,
  userId?: string
): Promise<{ data: PostData } | { data: null; message: string }> {
  const post = await getCachedPost(slug);

  if (!post) return { data: null, message: "文章不存在" };

  let isLiked = false;
  if (userId) {
    const like = await prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId: post.id } },
    });
    isLiked = !!like;
  }

  return {
    data: {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      status: post.status,
      featured: post.featured,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      author: post.author,
      tags: post.tags.map((t) => t.tag),
      commentCount: post._count.comments,
      isLiked,
    },
  };
}

// ============================================================
// 页面组件
// ============================================================

/**
 * 详情页 SEO：从 slug 取文章元数据，喂给 generateMetadata
 *  - useCache 与页面共享同一份缓存，避免重复查库
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<{
  title?: string;
  description?: string;
  openGraph?: { title?: string; description?: string; images?: string[]; type?: string };
}> {
  const result = await getPost(params.slug);
  const post = result.data;
  if (!post) return { title: "文章不存在" };

  const rawDesc = (post.excerpt || post.content || "")
    .replace(/[#>*_`~\-!\[\]\(\)]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  return {
    title: post.title,
    description: rawDesc,
    openGraph: {
      title: post.title,
      description: rawDesc,
      images: post.coverImage ? [post.coverImage] : [],
      type: "article",
    },
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await auth();
  const { data: post } = await getPost(params.slug, session?.user?.id);

  if (!post) {
    notFound();
  }

  const isAdmin = session?.user?.role === "ADMIN";

  const toc = extractToc(post.content);
  const dateStr = post.publishedAt ?? post.createdAt;
  const date = new Date(dateStr);

  // 读取配置
  const commentsPerPage = await getNumberConfig("comments_per_page", 20);
  const enableComments = await getBoolConfig("enable_comments", true);

  return (
    <>
      {/* 阅读进度条 */}
      <ReadingProgress />

      <div className="mx-auto max-w-5xl px-5 md:px-10 lg:px-20 py-16">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* ============================================================ */}
          {/* 主内容 */}
          {/* ============================================================ */}
          <article className="min-w-0 flex-1">
            {/* 顶部工具栏（返回 + 管理员操作） */}
            <div className="mb-5 flex items-center justify-between gap-4">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm text-[rgb(var(--muted-foreground))] hover:text-amber-bright transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                返回文章列表
              </Link>
              {isAdmin && (
                <Link
                  href={`/admin/posts/edit/${post.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  管理后台编辑
                </Link>
              )}
            </div>

            {/* 头部信息 */}
            <header className="mb-8">
              {/* 标签 */}
              {post.tags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/tags/${tag.slug}`}
                      className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-3 py-1 text-xs font-medium transition-colors hover:border-primary-300 hover:text-primary-600"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* 标题 */}
              <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight">
                {post.title}
              </h1>

              {/* 元信息 */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[rgb(var(--muted-foreground))]">
                {/* 作者 */}
                <div className="flex items-center gap-2">
                  <UserAvatar
                    name={post.author.name}
                    image={post.author.image}
                    userId={post.author.id}
                    size="sm"
                    ring
                  />
                  <span className="font-medium text-[rgb(var(--foreground))]">
                    {post.author.name || "匿名"}
                  </span>
                </div>

                <span>·</span>

                {/* 日期 */}
                <time dateTime={date.toISOString()}>
                  {date.toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>

                <span>·</span>

                {/* 阅读量 */}
                <span>{post.viewCount} 次阅读</span>

                {post.status === "DRAFT" && (
                  <>
                    <span>·</span>
                    <span className="rounded bg-amber/15 border border-amber/30 px-2 py-0.5 text-xs font-medium text-amber-bright">
                      草稿
                    </span>
                  </>
                )}
              </div>
            </header>

            {/* 封面图 */}
            {post.coverImage && (
              <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-xl border border-[rgb(var(--border))]">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 768px"
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* MDX 内容 */}
            <div className="mt-8">
              <MDXContent source={post.content} />
            </div>

            {/* 底部：点赞 + 分享 */}
            <div className="mt-12 flex items-center justify-center border-t border-[rgb(var(--border))] pt-8">
              <LikeButton
                slug={post.slug}
                initialLiked={post.isLiked}
                initialCount={post.likeCount}
                isLoggedIn={!!session?.user}
              />
            </div>

            {/* 评论区（延迟加载） */}
            {enableComments ? (
              <CommentSection postId={post.id} pageSize={commentsPerPage} />
            ) : (
              <div className="mt-12 rounded-xl border border-dashed border-[rgb(var(--border))] p-6 text-center">
                <p className="text-sm text-[rgb(var(--muted-foreground))]">
                  评论功能暂时关闭
                </p>
              </div>
            )}
          </article>

          {/* ============================================================ */}
          {/* 侧边栏 — TOC（桌面端 · 延迟加载） */}
          {/* ============================================================ */}
          {toc.length > 0 && <TocSidebar toc={toc} />}
        </div>
      </div>
    </>
  );
}