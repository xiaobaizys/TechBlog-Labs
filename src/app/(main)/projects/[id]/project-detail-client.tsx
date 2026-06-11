"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { toast } from "@/lib/toast";

type Props = {
  projectId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  isLoggedIn: boolean;
};

/**
 * 仿 GitHub Star 风格的点赞按钮
 *
 * 行为：未登录跳 /login；已登录 POST /api/projects/:id/like
 * 视觉：未点赞 - 普通边框按钮 + Star 图标
 *       已点赞 - 琥珀色填充 + Star 图标
 */
export function ProjectDetailClient({
  projectId,
  initialLiked,
  initialLikeCount,
  isLoggedIn,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialLikeCount);

  function handleToggle() {
    if (!isLoggedIn) {
      router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname));
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/like`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      const data = json.data;
      if (data) {
        const newLiked = Boolean(data.liked);
        setLiked(newLiked);
        setCount((c) => (newLiked ? c + 1 : Math.max(0, c - 1)));
        // 轻量 toast 反馈；不喜欢可注释掉
        toast.success(newLiked ? "已收藏" : "已取消收藏", { duration: 1500 });
      } else {
        toast.error(json.message || "操作失败");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      title={!isLoggedIn ? "登录后收藏" : liked ? "取消收藏" : "收藏这个项目"}
      className={`group inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
        liked
          ? "border-amber/40 bg-amber/15 text-amber-bright hover:bg-amber/20"
          : "border-[rgb(var(--border))] bg-[rgb(var(--background))] hover:border-amber hover:text-amber-bright"
      } disabled:opacity-60`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={liked ? "on" : "off"}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex items-center"
        >
          <Star
            className={`h-4 w-4 ${
              liked
                ? "fill-amber-bright text-amber-bright"
                : "fill-none group-hover:fill-amber-bright/30"
            }`}
          />
        </motion.span>
      </AnimatePresence>
      <span className="font-semibold tabular-nums">{count}</span>
      <span className="hidden sm:inline">{liked ? "Starred" : "Star"}</span>
    </button>
  );
}
