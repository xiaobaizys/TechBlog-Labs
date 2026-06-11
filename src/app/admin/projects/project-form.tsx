"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";

type FormData = {
  id?: string;
  title: string;
  description: string;
  content: string;
  coverImage: string;
  techStack: string[];
  repoUrl: string;
  demoUrl: string;
  downloadUrl: string;
  isPublic: boolean;
  featured: boolean;
};

const DEFAULT: FormData = {
  title: "", description: "", content: "", coverImage: "",
  techStack: [], repoUrl: "", demoUrl: "", downloadUrl: "",
  isPublic: true, featured: false,
};

export function ProjectForm({ initialData }: { initialData?: FormData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormData>(initialData ?? DEFAULT);
  const [techInput, setTechInput] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isEdit = !!initialData?.id;

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function addTech() {
    const t = techInput.trim();
    if (!t || form.techStack.includes(t)) { setTechInput(""); return; }
    setForm((p) => ({ ...p, techStack: [...p.techStack, t] }));
    setTechInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.title.trim()) {
      setError("项目名称不能为空");
      toast.error("项目名称不能为空");
      return;
    }
    if (!form.description.trim()) {
      setError("项目描述不能为空");
      toast.error("项目描述不能为空");
      return;
    }

    startTransition(async () => {
      try {
        const url = isEdit ? `/api/projects/${initialData!.id}` : "/api/projects";
        const res = await fetch(url, {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            coverImage: form.coverImage || null,
            repoUrl: form.repoUrl || null,
            demoUrl: form.demoUrl || null,
            downloadUrl: form.downloadUrl || null,
            content: form.content || null,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          const msg = data.message || "操作失败";
          setError(msg);
          toast.error(msg);
          return;
        }
        const successMsg = isEdit ? "项目已更新" : "项目已创建";
        setSuccess(successMsg);
        toast.success(successMsg);
        if (!isEdit) setTimeout(() => router.push(`/admin/projects/edit/${data.data.id}`), 800);
        else setTimeout(() => setSuccess(""), 2000);
      } catch {
        const msg = "网络错误";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">{success}</div>}

      {/* 标题 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">项目名称</label>
        <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} required
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
      </div>

      {/* 描述 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">简短描述</label>
        <textarea value={form.description} onChange={(e) => update("description", e.target.value)} required rows={3}
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-y" />
      </div>

      {/* 封面图 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">封面图 URL</label>
        <input type="url" value={form.coverImage} onChange={(e) => update("coverImage", e.target.value)}
          placeholder="https://..." className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
      </div>

      {/* 技术栈 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">技术栈</label>
        <div className="flex gap-2">
          <input type="text" value={techInput} onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(); } }}
            placeholder="输入后回车添加" className="flex-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
          <button type="button" onClick={addTech} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm hover:bg-[rgb(var(--muted))]">添加</button>
        </div>
        {form.techStack.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {form.techStack.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] px-2.5 py-0.5 text-xs">
                {t}
                <button type="button" onClick={() => update("techStack", form.techStack.filter((x) => x !== t))} className="text-[rgb(var(--muted-foreground))] hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 链接 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">仓库地址</label>
          <input type="url" value={form.repoUrl} onChange={(e) => update("repoUrl", e.target.value)} placeholder="https://github.com/..."
            className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">演示地址</label>
          <input type="url" value={form.demoUrl} onChange={(e) => update("demoUrl", e.target.value)} placeholder="https://..."
            className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">下载地址</label>
          <input type="url" value={form.downloadUrl} onChange={(e) => update("downloadUrl", e.target.value)} placeholder="https://..."
            className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
        </div>
      </div>

      {/* 详细内容 (MDX) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">详细内容 (MDX/Markdown)</label>
        <textarea value={form.content} onChange={(e) => update("content", e.target.value)} rows={12}
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 text-sm font-mono outline-none focus:border-primary-500 resize-y" />
      </div>

      {/* 开关 */}
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isPublic} onChange={(e) => update("isPublic", e.target.checked)} className="h-4 w-4 rounded border-[rgb(var(--border))] text-primary-600" />
          公开
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} className="h-4 w-4 rounded border-[rgb(var(--border))] text-primary-600" />
          精选项目
        </label>
      </div>

      {/* 按钮 */}
      <div className="flex items-center gap-3 pt-4 border-t border-[rgb(var(--border))]">
        <button type="submit" disabled={isPending} className="btn-shimmer disabled:opacity-60">
          {isPending ? "保存中..." : isEdit ? "更新项目" : "创建项目"}
        </button>
        <Link href="/admin/projects" className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-6 py-2.5 text-sm hover:bg-[rgb(var(--muted))]">取消</Link>
      </div>
    </form>
  );
}
