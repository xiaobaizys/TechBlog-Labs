"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ImageGrid } from "@/components/life/ImageGrid";
import { UserAvatar } from "@/components/user/UserAvatar";

type LifePostData = {
  id: string; content: string; images: string[];
  likeCount: number; isPublic: boolean; isLiked: boolean;
  createdAt: string; updatedAt: string;
  author: { id: string; name: string | null; image: string | null };
};

export function LifeDetailClient({
  post: initialPost,
  currentUserId,
  isAdmin,
}: {
  post: LifePostData;
  currentUserId?: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [post, setPost] = useState(initialPost);
  const isOwner = currentUserId === post.author.id;
  const canEdit = isOwner || isAdmin;

  async function handleLike() {
    if (!currentUserId) { router.push("/login"); return; }
    startTransition(async () => {
      const res = await fetch(`/api/life-posts/${post.id}/like`, { method: "POST" });
      const { data } = await res.json();
      if (data) {
        setPost((p) => ({
          ...p,
          isLiked: data.liked,
          likeCount: data.liked ? p.likeCount + 1 : Math.max(0, p.likeCount - 1),
        }));
      }
    });
  }

  async function handleDelete() {
    if (!confirm("确定删除？")) return;
    startTransition(async () => {
      const res = await fetch(`/api/life-posts/${post.id}`, { method: "DELETE" });
      if (res.ok) router.push("/life");
    });
  }

  const date = new Date(post.createdAt);

  return (
    <article>
      {/* 返回 */}
      <Link href="/life" className="mb-6 inline-flex items-center gap-1 text-sm text-[rgb(var(--muted-foreground))] hover:text-amber-bright transition-colors">
        ← 返回
      </Link>

      {/* 作者 */}
      <div className="mt-4 flex items-center gap-3">
        <UserAvatar
          name={post.author.name}
          image={post.author.image}
          userId={post.author.id}
          size="lg"
          ring
        />
        <div>
          <p className="font-medium">{post.author.name || "匿名用户"}</p>
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            {date.toLocaleDateString("zh-CN", { year:"numeric", month:"long", day:"numeric" })}{" "}
            {date.toLocaleTimeString("zh-CN", { hour:"2-digit", minute:"2-digit" })}
          </p>
        </div>
      </div>

      {/* 内容 */}
      <div className="mt-5 text-sm leading-relaxed whitespace-pre-wrap break-words">
        <ReactMarkdown
          components={{
            a: (p: any) => <a {...p} target="_blank" rel="noopener noreferrer" className="text-amber-bright underline" />,
            code: (p: any) => <code {...p} className="rounded bg-[rgb(var(--muted))] px-1 py-0.5 font-mono text-xs" />,
          }}
        >
          {post.content}
        </ReactMarkdown>
      </div>

      {/* 图片 */}
      {post.images.length > 0 && (
        <div className="mt-4">
          <ImageGrid images={post.images} />
        </div>
      )}

      {/* 底部操作 */}
      <div className="mt-6 flex items-center gap-3 border-t border-[rgb(var(--border))] pt-5">
        <button
          onClick={handleLike}
          disabled={isPending}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            post.isLiked ? "bg-red-50 text-red-500 dark:bg-red-950" : "border border-[rgb(var(--border))] hover:bg-[rgb(var(--muted))]"
          }`}
        >
          <svg className={`h-5 w-5 ${post.isLiked ? "fill-red-500" : "fill-none"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {post.likeCount > 0 && post.likeCount}
        </button>

        {canEdit && (
          <>
            {isOwner && (
              <Link href={`/life/edit/${post.id}`} className="rounded-lg border border-[rgb(var(--border))] px-4 py-2 text-sm hover:bg-[rgb(var(--muted))]">
                编辑
              </Link>
            )}
            <button onClick={handleDelete} disabled={isPending} className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950">
              删除
            </button>
          </>
        )}
      </div>
    </article>
  );
}
