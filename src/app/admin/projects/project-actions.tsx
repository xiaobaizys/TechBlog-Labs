"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";

interface ProjectActionsProps {
  id: string;
  title: string;
}

export function ProjectActions({ id, title }: ProjectActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`确定要删除项目「${title}」吗？此操作不可恢复。`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(`删除失败：${err.message ?? res.statusText}`);
        return;
      }
      router.refresh();
      toast.success("项目已删除");
    } catch (e) {
      toast.error(`删除失败：${e instanceof Error ? e.message : "未知错误"}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/projects/edit/${id}`}
        className="rounded-md px-2.5 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950"
      >
        编辑
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950"
      >
        {deleting ? "删除中..." : "删除"}
      </button>
    </div>
  );
}
