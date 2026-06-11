"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import { ImageGrid } from "./ImageGrid";
import { motion } from "framer-motion";
import { UserAvatar } from "@/components/user/UserAvatar";

export type LifePostData = {
  id: string;
  content: string;
  images: string[];
  likeCount: number;
  isPublic: boolean;
  isLiked?: boolean;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
};

type LifeCardProps = {
  post: LifePostData;
  onDelete?: (id: string) => void;
};

export function LifeCard({ post, onDelete }: LifeCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const isOwner = session?.user?.id === post.author.id;
  const isAdmin = session?.user?.role === "ADMIN";

  async function handleLike() {
    if (!session?.user) {
      router.push("/login");
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/life-posts/${post.id}/like`, { method: "POST" });
      const { data } = await res.json();
      if (data) {
        setLiked(data.liked);
        setLikeCount((c) => (data.liked ? c + 1 : Math.max(0, c - 1)));
      }
    });
  }

  async function handleDelete() {
    if (!confirm("确定删除这条分享？")) return;

    startTransition(async () => {
      const res = await fetch(`/api/life-posts/${post.id}`, { method: "DELETE" });
      if (res.ok) onDelete?.(post.id);
    });
  }

  const date = new Date(post.createdAt);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="theme-card overflow-hidden"
    >
      {/* 头部：作者信息 */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <Link href={`/profile/life?userId=${post.author.id}`}>
          <UserAvatar
            name={post.author.name}
            image={post.author.image}
            userId={post.author.id}
            size="md"
            ring
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/life?userId=${post.author.id}`} className="text-sm font-medium hover:text-amber-bright transition-colors">
            {post.author.name || "匿名用户"}
          </Link>
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            {date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}{" "}
            {date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* 操作按钮 */}
        {(isOwner || isAdmin) && (
          <div className="flex items-center gap-1">
            {isOwner && (
              <Link
                href={`/life/edit/${post.id}`}
                className="rounded p-1 text-xs text-[rgb(var(--muted-foreground))] hover:text-amber-bright transition-colors"
              >
                编辑
              </Link>
            )}
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="rounded p-1 text-xs text-[rgb(var(--muted-foreground))] hover:text-red-500 transition-colors"
            >
              删除
            </button>
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className="px-5 pb-3">
        <div className="text-sm leading-relaxed prose-custom whitespace-pre-wrap break-words">
          <ReactMarkdown
            components={{
              a: (p: any) => <a {...p} target="_blank" rel="noopener noreferrer" className="text-amber-bright underline" />,
              code: (p: any) => <code {...p} className="rounded bg-[rgb(var(--muted))] px-1 py-0.5 font-mono text-xs" />,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </div>

      {/* 图片 */}
      {post.images.length > 0 && (
        <div className="px-5 pb-4">
          <ImageGrid images={post.images} />
        </div>
      )}

      {/* 底部：点赞 */}
      <div className="flex items-center gap-2 border-t border-[rgb(var(--border))] px-5 py-3">
        <button
          onClick={handleLike}
          disabled={isPending}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            liked
              ? "bg-red-50 text-red-500 dark:bg-red-950"
              : "text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] hover:text-red-500"
          }`}
        >
          <svg className={`h-4 w-4 ${liked ? "fill-red-500" : "fill-none"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
      </div>
    </motion.article>
  );
}
