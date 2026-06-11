import Link from "next/link";
import Image from "next/image";
import { UserAvatar } from "@/components/user/UserAvatar";

export type BlogCardPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  status: string;
  featured: boolean;
  viewCount: number;
  likeCount: number;
  publishedAt: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  tags: {
    id: string;
    name: string;
    slug: string;
  }[];
};

export function BlogCard({ post }: { post: BlogCardPost }) {
  const dateStr = post.publishedAt ?? post.createdAt;
  const date = new Date(dateStr);

  return (
    <article className="theme-card-hover group overflow-hidden h-full flex flex-col">
      {/* 封面图 */}
      {post.coverImage && (
        <Link href={`/blog/${post.slug}`} className="block overflow-hidden">
          <Image
            src={post.coverImage}
            alt={post.title}
            width={800}
            height={384}
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </Link>
      )}

      <div className="p-5 flex-1 flex flex-col">
        {/* 标签 */}
        {post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag.id}
                href={`/tags/${tag.slug}`}
                className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2.5 py-0.5 text-xs font-medium text-[rgb(var(--muted-foreground))] transition-colors hover:border-amber hover:text-amber"
              >
                {tag.name}
              </Link>
            ))}
            {post.tags.length > 3 && (
              <span className="text-xs text-[rgb(var(--muted-foreground))]">
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 标题 */}
        <Link href={`/blog/${post.slug}`} className="group/title">
          <h2 className="text-lg font-serif font-medium leading-snug tracking-tight transition-colors group-hover/title:text-amber-bright">
            {post.title}
          </h2>
        </Link>

        {/* 摘要 */}
        {post.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[rgb(var(--muted-foreground))]">
            {post.excerpt}
          </p>
        )}

        {/* 底部信息 */}
        <div className="mt-auto pt-4 flex items-center gap-4 text-xs text-[rgb(var(--muted-foreground))]">
          {/* 作者 */}
          <div className="flex items-center gap-1.5">
            <UserAvatar
              name={post.author.name}
              image={post.author.image}
              userId={post.author.id}
              size="xs"
            />
            <span>{post.author.name || "匿名"}</span>
          </div>

          {/* 日期 */}
          <time dateTime={date.toISOString()}>
            {date.toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>

          {/* 阅读量 */}
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {post.viewCount}
          </span>

          {/* 点赞数 */}
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {post.likeCount}
          </span>
        </div>
      </div>
    </article>
  );
}
