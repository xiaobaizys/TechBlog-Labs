import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { MDXContent, extractToc, type TocEntry } from "@/lib/mdx";
import { LikeButton } from "./like-button";
import { ReadingProgress } from "./reading-progress";
import { TocSidebar } from "./toc-sidebar";
import { CommentSection } from "@/components/comments/CommentSection";
import { UserAvatar } from "@/components/user/UserAvatar";
import { getNumberConfig, getBoolConfig } from "@/lib/config";

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
// 数据获取
// ============================================================

async function getPost(
  slug: string
): Promise<{ data: PostData } | { data: null; message: string }> {
  // 使用内部调用而非完整 URL，避免构建时连接问题
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/posts/${slug}`, {
    cache: "no-store",
  });
  if (!res.ok) return { data: null, message: "文章不存在" };
  return res.json();
}

// ============================================================
// 页面组件
// ============================================================

/**
 * 详情页 SEO：从 slug 取文章元数据，喂给 generateMetadata
 *  - Next.js 会把 metadata 和页面并行渲染（同请求内 fetch 自动 dedupe）
 *  - 文章存在：title 用标题，description 用 excerpt 或正文前 160 字
 *  - 文章不存在：fallback 到默认 title，由 notFound() 兜住
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
  const { data: post } = await getPost(params.slug);
  if (!post) return { title: "文章不存在" };

  // 截断到 ~160 中文字符做 description
  const rawDesc = (post.excerpt || post.content || "")
    .replace(/[#>*_`~\-!\[\]\(\)]/g, "") // 去掉常见 markdown 符号
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
  const { data: post } = await getPost(params.slug);

  if (!post) {
    notFound();
  }

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
        <div className="flex gap-10">
          {/* ============================================================ */}
          {/* 主内容 */}
          {/* ============================================================ */}
          <article className="min-w-0 flex-1">
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

            {/* 评论区 */}
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
          {/* 侧边栏 — TOC */}
          {/* ============================================================ */}
          {toc.length > 0 && <TocSidebar toc={toc} />}
        </div>
      </div>
    </>
  );
}
