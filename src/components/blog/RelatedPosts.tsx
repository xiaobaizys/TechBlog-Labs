"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

type RelatedPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: string | null;
  tags: { id: string; name: string }[];
};

interface RelatedPostsProps {
  postId: string;
  tags: { id: string; name: string; slug: string }[];
}

export function RelatedPosts({ postId, tags }: RelatedPostsProps) {
  const [posts, setPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const tagIds = tags.map((t) => t.id).join(",");
        const res = await fetch(`/api/posts/related?id=${postId}&tags=${tagIds}`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts || []);
        }
      } catch {
        // 静默失败
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchRelated();
    }
  }, [postId, tags]);

  if (loading) {
    return (
      <div className="mt-12 border-t border-[rgb(var(--border))] pt-8">
        <h2 className="mb-6 text-xl font-semibold">相关文章</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4"
            >
              <div className="mb-3 h-4 w-3/4 rounded bg-[rgb(var(--muted))]" />
              <div className="mb-2 h-3 w-full rounded bg-[rgb(var(--muted))]" />
              <div className="h-3 w-1/2 rounded bg-[rgb(var(--muted))]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 border-t border-[rgb(var(--border))] pt-8">
      <h2 className="mb-6 text-xl font-semibold">相关文章</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 transition-all hover:border-amber hover:shadow-lg"
          >
            {post.coverImage && (
              <div className="relative mb-3 aspect-[16/9] overflow-hidden rounded-lg">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </div>
            )}
            <h3 className="mb-2 font-medium line-clamp-2 group-hover:text-amber-bright transition-colors">
              {post.title}
            </h3>
            {post.excerpt && (
              <p className="text-sm text-[rgb(var(--muted-foreground))] line-clamp-2">
                {post.excerpt}
              </p>
            )}
            {post.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {post.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-[rgb(var(--muted))] px-2 py-0.5 text-xs"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
