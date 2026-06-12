"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Background = {
  id: string;
  url: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormData = {
  url: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

const EMPTY_FORM: FormData = { url: "", name: "", sortOrder: 0, isActive: true };

export function HomeBgClient() {
  const [items, setItems] = useState<Background[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/home-backgrounds");
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch {
      setError("获取列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.url.trim() || !form.name.trim()) {
      setError("图片 URL 和名称均为必填项");
      return;
    }

    try {
      const url = editId
        ? `/api/admin/home-backgrounds/${editId}`
        : "/api/admin/home-backgrounds";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (json.success) {
        setShowForm(false);
        setForm(EMPTY_FORM);
        setEditId(null);
        setPreview(null);
        fetchItems();
      } else {
        setError(json.message || "操作失败");
      }
    } catch {
      setError("操作失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这张背景图片吗？")) return;
    try {
      const res = await fetch(`/api/admin/home-backgrounds/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) fetchItems();
    } catch {
      setError("删除失败");
    }
  };

  const startEdit = (item: Background) => {
    setForm({ url: item.url, name: item.name, sortOrder: item.sortOrder, isActive: item.isActive });
    setEditId(item.id);
    setPreview(item.url);
    setShowForm(true);
  };

  const handleUrlChange = (val: string) => {
    setForm({ ...form, url: val });
    if (val.trim()) setPreview(val);
    else setPreview(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        const path = json.data.url;
        setForm((prev) => ({ ...prev, url: path }));
        setPreview(path);
      } else {
        setError(json.message || "上传失败");
      }
    } catch {
      setError("上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-sm text-[rgb(var(--muted-foreground))]">加载中...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* 头部 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-bright/80 font-mono mb-2">
            — Backgrounds
          </p>
          <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
            首页背景管理
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
            管理首页 Hero 区域的背景图片，支持 URL 和本地上传
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM); setPreview(null); setError(""); }}
          className="rounded-lg bg-amber px-4 py-2 text-sm font-medium text-night transition-colors hover:bg-amber-bright"
        >
          {showForm ? "取消" : "新增背景"}
        </button>
      </div>

      {/* 错误 */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* 表单 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="theme-card mb-6 p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                图片 URL <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  value={form.url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="/uploads/background.jpg 或 https://example.com/bg.jpg"
                  className="flex-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none focus:border-amber"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-sm font-medium transition-colors hover:bg-[rgb(var(--muted))] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading ? "上传中..." : "上传本地图片"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleUpload}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                名称 <span className="text-red-400">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：晨曦、暮色"
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none focus:border-amber"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                排序
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none focus:border-amber"
              />
            </div>
          </div>

          {/* 预览 */}
          {preview && (
            <div className="overflow-hidden rounded-lg border border-[rgb(var(--border))]">
              <img
                src={preview}
                alt="预览"
                className="h-40 w-full object-cover"
                onError={() => setPreview(null)}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-[rgb(var(--border))]"
            />
            <label htmlFor="isActive" className="text-sm">启用</label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); setPreview(null); }}
              className="rounded-lg border border-[rgb(var(--border))] px-4 py-2 text-sm transition-colors hover:bg-[rgb(var(--muted))]"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber px-4 py-2 text-sm font-medium text-night transition-colors hover:bg-amber-bright"
            >
              {editId ? "保存修改" : "添加背景"}
            </button>
          </div>
        </form>
      )}

      {/* 列表 */}
      {items.length === 0 ? (
        <div className="theme-card p-8 text-center">
          <p className="text-sm text-[rgb(var(--muted-foreground))]">暂无背景图片</p>
          <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">点击右上角「新增背景」添加</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`theme-card overflow-hidden transition-all ${
                !item.isActive ? "opacity-50" : ""
              }`}
            >
              {/* 预览 */}
              <div className="relative aspect-video overflow-hidden bg-[rgb(var(--muted))]">
                <img
                  src={item.url}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
                {!item.isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="rounded-full bg-[rgb(var(--card))]/80 px-3 py-1 text-xs font-medium">
                      已停用
                    </span>
                  </div>
                )}
              </div>

              {/* 信息 */}
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium">{item.name}</h3>
                  <p className="truncate text-xs text-[rgb(var(--muted-foreground))]">
                    {item.url}
                  </p>
                  <p className="text-[10px] text-[rgb(var(--muted-foreground))]">
                    排序: {item.sortOrder}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="rounded-lg border border-[rgb(var(--border))] px-2.5 py-1.5 text-xs transition-colors hover:bg-[rgb(var(--muted))]"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg border border-[rgb(var(--border))] px-2.5 py-1.5 text-xs transition-colors hover:border-red-500 hover:text-red-400"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}