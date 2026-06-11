"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

type CommentFormProps = {
  postId: string;
  /** 回复某条评论时的父评论ID */
  parentId?: string | null;
  /** 回复时显示的提示文本 */
  replyTo?: string | null;
  /** 提交成功后的回调 */
  onSuccess?: () => void;
  /** 取消回复的回调 */
  onCancel?: () => void;
};

export function CommentForm({
  postId,
  parentId = null,
  replyTo = null,
  onSuccess,
  onCancel,
}: CommentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmed = content.trim();
    if (!trimmed) {
      setError("请输入评论内容");
      toast.error("请输入评论内容");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId,
            content: trimmed,
            parentId,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          const msg = data.message || "提交失败";
          setError(msg);
          toast.error(msg);
          return;
        }

        setContent("");
        setSuccess("评论已提交，审核通过后显示");
        toast.success("评论已提交，审核通过后显示");

        setTimeout(() => {
          setSuccess("");
          onSuccess?.();
        }, 1500);

        router.refresh();
      } catch {
        const msg = "网络错误，请重试";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  const isReply = !!replyTo;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* 回复提示 */}
      {isReply && (
        <div className="flex items-center gap-2 text-xs text-[rgb(var(--muted-foreground))]">
          <svg className="h-3 w-3 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          回复 <span className="font-medium text-[rgb(var(--foreground))]">{replyTo}</span>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto text-[rgb(var(--muted-foreground))] hover:text-red-500"
          >
            × 取消
          </button>
        </div>
      )}

      {/* 文本框 */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={isReply ? "写下你的回复..." : "写下你的评论..."}
        rows={isReply ? 3 : 4}
        className="w-full resize-y rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none transition-all placeholder:text-[rgb(var(--muted-foreground))] focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
      />

      {/* 消息提示 */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      {success && (
        <p className="text-xs text-green-500">{success}</p>
      )}

      {/* 提示 + 提交 */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[rgb(var(--muted-foreground))]">
          支持 <strong>**粗体**</strong>、<code>`代码`</code>、[链接](url)
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-sm font-medium transition-colors hover:bg-[rgb(var(--muted))]"
            >
              取消
            </button>
          )}
          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="rounded-lg bg-amber px-4 py-2 text-sm font-medium text-night transition-all hover:bg-amber-bright hover:shadow-amber disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                提交中
              </span>
            ) : (
              "提交"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
