"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type LikeButtonProps = {
  slug: string;
  initialLiked: boolean;
  initialCount: number;
  isLoggedIn: boolean;
};

export function LikeButton({
  slug,
  initialLiked,
  initialCount,
  isLoggedIn,
}: LikeButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  async function handleToggle() {
    if (!isLoggedIn) {
      router.push("/login?callbackUrl=" + encodeURIComponent(`/blog/${slug}`));
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/posts/${slug}/like`, { method: "POST" });
        const { data } = await res.json();
        if (data) {
          setLiked(data.liked);
          setCount((prev) => (data.liked ? prev + 1 : Math.max(0, prev - 1)));
        }
      } catch {
        // 忽略错误
      }
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="group flex flex-col items-center gap-2"
    >
      <motion.div
        whileTap={{ scale: 0.85 }}
        className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all ${
          liked
            ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950"
            : "border-[rgb(var(--border))] bg-[rgb(var(--card))] hover:border-amber hover:shadow-amber"
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.svg
            key={liked ? "filled" : "outline"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`h-6 w-6 ${
              liked
                ? "fill-red-500 text-red-500"
                : "fill-none text-[rgb(var(--muted-foreground))]"
            }`}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </motion.svg>
        </AnimatePresence>
      </motion.div>
      <span className="text-sm font-medium">{count}</span>
      {!isLoggedIn && (
        <span className="text-xs text-[rgb(var(--muted-foreground))]">
          登录后点赞
        </span>
      )}
    </button>
  );
}
