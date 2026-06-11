"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TextareaAutosize from "react-textarea-autosize";
import { ImageUploader } from "@/components/life/ImageUploader";
import { toast } from "@/lib/toast";

type LifeFormData = {
  id?: string;
  content: string;
  images: string[];
  isPublic: boolean;
};

export function LifeForm({ initialData }: { initialData?: LifeFormData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState(initialData?.content ?? "");
  const [images, setImages] = useState<string[]>(initialData?.images ?? []);
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEdit = !!initialData?.id;
  const maxLength = 500;
  const remaining = maxLength - content.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!content.trim()) {
      setError("请输入内容");
      toast.error("请输入内容");
      return;
    }
    if (content.length > maxLength) {
      const msg = `内容最多${maxLength}字`;
      setError(msg);
      toast.error(msg);
      return;
    }

    startTransition(async () => {
      try {
        const url = isEdit ? `/api/life-posts/${initialData!.id}` : "/api/life-posts";
        const method = isEdit ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim(), images, isPublic }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          const msg = data.message || "操作失败";
          setError(msg);
          toast.error(msg);
          return;
        }

        const successMsg = isEdit ? "已更新" : "发布成功";
        setSuccess(successMsg);
        toast.success(successMsg);
        setTimeout(() => router.push("/life"), 800);
      } catch {
        const msg = "网络错误";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">{success}</div>}

      {/* 内容 */}
      <div>
        <TextareaAutosize
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="分享你的生活碎片..."
          minRows={4}
          maxRows={10}
          className="w-full resize-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
        <p className={`mt-1 text-xs ${remaining < 0 ? "text-red-500" : "text-[rgb(var(--muted-foreground))]"}`}>
          {remaining} / {maxLength}
        </p>
      </div>

      {/* 图片上传 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">图片（最多9张）</label>
        <ImageUploader images={images} onChange={setImages} maxImages={9} />
      </div>

      {/* 公开/私密 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">公开</span>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          onClick={() => setIsPublic(!isPublic)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${isPublic ? "bg-amber" : "bg-[rgb(var(--border))]"}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      {/* 按钮 */}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending || !!success} className="btn-shimmer text-sm">
          {isPending ? "发布中..." : isEdit ? "保存" : "发布"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-sm">
          取消
        </button>
      </div>
    </form>
  );
}
