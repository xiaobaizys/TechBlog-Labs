"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

/* ============================================================
   类型
   ============================================================ */

type Author = {
  id: string;
  name: string | null;
  image: string | null;
};

type Tag = {
  id: string;
  name: string;
  slug: string;
};

export type WritingHeroPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  createdAt: string;
  viewCount: number;
  author: Author;
  tags: Tag[];
};

export interface WritingHeroProps {
  posts: WritingHeroPost[];
  totalCount?: number;
  viewAllHref?: string;
}

/* ============================================================
   工具
   ============================================================ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ============================================================
   Hero 头部（从首页"最新文章"迁移而来）
   ============================================================ */

export function WritingHero({
  totalCount,
}: Pick<WritingHeroProps, "totalCount">) {
  return (
    <div className="mb-14">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-bright/80 font-mono mb-3 flex items-center gap-3">
        <span className="inline-block w-8 h-px bg-amber-bright/60" />
        — Writing
      </p>
      <h1 className="text-3xl md:text-5xl font-serif font-medium tracking-tight text-foreground leading-[1.1]">
        最新<span className="italic text-amber-bright"> 文章 </span>
      </h1>
      <p className="mt-3 text-muted-foreground text-sm md:text-base">
        从技术到生活，分享有温度的思考
        {typeof totalCount === "number" && totalCount > 0
          ? ` · 共 ${totalCount} 篇`
          : ""}
      </p>
    </div>
  );
}

/* ============================================================
   卡片（与首页原 writing 卡片视觉一致）
   ============================================================ */

export function WritingPostCard({
  post,
  index = 0,
}: {
  post: WritingHeroPost;
  index?: number;
}) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      data-cursor="hover"
      className="theme-card-hover group block overflow-hidden h-full"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {post.coverImage && (
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={post.coverImage}
            alt={post.title}
            width={400}
            height={250}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-6">
        <h3 className="font-serif font-medium text-lg mb-2 text-foreground group-hover:text-amber-bright transition-colors line-clamp-2">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {post.excerpt}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
          <span>·</span>
          <span>{post.viewCount} 阅读</span>
        </div>
      </div>
    </Link>
  );
}

/* ============================================================
   完整 Writing 区块（顶部 Hero + 卡片 + 全部链接）
   ============================================================ */

export function WritingSection({
  posts,
  totalCount,
  viewAllHref = "/blog",
}: WritingHeroProps) {
  return (
    <section className="vitalog-section px-5 md:px-10 lg:px-20 py-24">
      <WritingHero totalCount={totalCount} />

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {posts.map((post, i) => (
            <WritingPostCard key={post.id} post={post} index={i} />
          ))}
        </div>
      ) : (
        <div className="vitalog-empty text-center py-16 text-muted-foreground max-w-6xl mx-auto">
          <p className="text-sm">暂无文章</p>
        </div>
      )}

      <div className="text-center mt-12">
        <Link
          href={viewAllHref}
          data-cursor="hover"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-amber transition-colors group"
        >
          查看全部文章
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

export default WritingSection;
