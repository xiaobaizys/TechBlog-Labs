"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";

type PostFormData = {
  id?: string;
  title: string;
  content: string;
  excerpt: string;
  coverImage: string;
  tags: string[];
  status: string;
  featured: boolean;
};

type PostFormProps = {
  initialData?: PostFormData;
};

const DEFAULT: PostFormData = {
  title: "",
  content: "",
  excerpt: "",
  coverImage: "",
  tags: [],
  status: "DRAFT",
  featured: false,
};

export function PostForm({ initialData }: PostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<PostFormData>(initialData ?? DEFAULT);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEdit = !!initialData?.id;

  function updateField(field: keyof PostFormData, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addTag() {
    const tag = tagInput.trim();
    if (!tag || form.tags.includes(tag)) {
      setTagInput("");
      return;
    }
    setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("标题不能为空");
      return;
    }
    if (!form.content.trim()) {
      setError("内容不能为空");
      return;
    }

    startTransition(async () => {
      try {
        const url = isEdit
          ? `/api/posts/admin/${initialData!.id}`
          : "/api/posts";

        const method = isEdit ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.message || "操作失败");
          toast.error(data.message || "操作失败");
          return;
        }

        const successMsg = isEdit ? "文章已更新" : "文章已创建";
        setSuccess(successMsg);
        toast.success(successMsg);

        if (!isEdit) {
          // 创建成功后跳转编辑页
          setTimeout(() => {
            router.push(`/admin/posts/edit/${data.data.id}`);
            router.refresh();
          }, 800);
        } else {
          router.refresh();
          setTimeout(() => setSuccess(""), 2000);
        }
      } catch {
        const msg = "网络错误，请重试";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 消息提示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          {success}
        </div>
      )}

      {/* 标题 */}
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
          标题
        </label>
        <input
          id="title"
          type="text"
          required
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="文章标题"
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {/* 摘要 */}
      <div>
        <label htmlFor="excerpt" className="mb-1.5 block text-sm font-medium">
          摘要
        </label>
        <input
          id="excerpt"
          type="text"
          value={form.excerpt}
          onChange={(e) => updateField("excerpt", e.target.value)}
          placeholder="简短描述（可选）"
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {/* 封面图 */}
      <div>
        <label htmlFor="cover" className="mb-1.5 block text-sm font-medium">
          封面图 URL
        </label>
        <input
          id="cover"
          type="url"
          value={form.coverImage}
          onChange={(e) => updateField("coverImage", e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {/* 标签 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">标签</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="输入标签后回车添加"
            className="flex-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
          <button
            type="button"
            onClick={addTag}
            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm transition-colors hover:bg-[rgb(var(--muted))]"
          >
            添加
          </button>
        </div>
        {form.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2.5 py-0.5 text-xs"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 text-[rgb(var(--muted-foreground))] hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 内容 */}
      <div>
        <label htmlFor="content" className="mb-1.5 block text-sm font-medium">
          内容 (MDX/Markdown)
        </label>
        <textarea
          id="content"
          required
          rows={20}
          value={form.content}
          onChange={(e) => updateField("content", e.target.value)}
          placeholder="写一些 Markdown 内容..."
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 text-sm font-mono outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-y"
        />
        <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
          支持 Markdown 和 MDX 语法。代码块使用 ```language 包裹。
        </p>
      </div>

      {/* 状态 + 精选 */}
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <label htmlFor="status" className="mb-1.5 block text-sm font-medium">
            状态
          </label>
          <select
            id="status"
            value={form.status}
            onChange={(e) => updateField("status", e.target.value)}
            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none focus:border-primary-500"
          >
            <option value="DRAFT">草稿</option>
            <option value="PUBLISHED">发布</option>
          </select>
        </div>

        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id="featured"
            checked={form.featured}
            onChange={(e) => updateField("featured", e.target.checked)}
            className="h-4 w-4 rounded border-[rgb(var(--border))] text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="featured" className="text-sm font-medium">
            精选文章
          </label>
        </div>
      </div>

      {/* 按钮 */}
      <div className="flex items-center gap-3 pt-4 border-t border-[rgb(var(--border))]">
        <button
          type="submit"
          disabled={isPending}
          className="btn-shimmer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "保存中..."
            : isEdit
            ? "更新文章"
            : "创建文章"}
        </button>
        <Link
          href="/admin/posts"
          className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-6 py-2.5 text-sm font-medium transition-colors hover:bg-[rgb(var(--muted))]"
        >
          取消
        </Link>
      </div>
    </form>
  );
}
