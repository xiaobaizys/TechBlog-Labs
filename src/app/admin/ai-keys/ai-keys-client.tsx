"use client";

import { useState, useEffect, useCallback } from "react";

type Provider = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormData = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  isActive: boolean;
};

const EMPTY_FORM: FormData = { name: "", baseUrl: "", apiKey: "", model: "", isActive: false };

export function AiKeysClient() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-providers");
      const json = await res.json();
      if (json.success) setProviders(json.data);
    } catch {
      setError("获取列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.baseUrl.trim() || !form.apiKey.trim() || !form.model.trim()) {
      setError("所有字段均为必填项");
      return;
    }

    try {
      const url = editId
        ? `/api/admin/ai-providers/${editId}`
        : "/api/admin/ai-providers";
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
        fetchProviders();
      } else {
        setError(json.message || "操作失败");
      }
    } catch {
      setError("操作失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个 AI 提供商吗？")) return;
    try {
      const res = await fetch(`/api/admin/ai-providers/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) fetchProviders();
    } catch {
      setError("删除失败");
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/ai-providers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      const json = await res.json();
      if (json.success) fetchProviders();
    } catch {
      setError("操作失败");
    }
  };

  const startEdit = (p: Provider) => {
    setForm({ name: p.name, baseUrl: p.baseUrl, apiKey: "", model: p.model, isActive: p.isActive });
    setEditId(p.id);
    setShowForm(true);
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
            — AI Management
          </p>
          <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
            AI 提供商管理
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
            管理 AI 助手的 API 提供商，支持添加、删除和切换使用
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM); setError(""); }}
          className="rounded-lg bg-amber px-4 py-2 text-sm font-medium text-night transition-colors hover:bg-amber-bright"
        >
          {showForm ? "取消" : "新增提供商"}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* 表单 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="theme-card mb-6 p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                名称 <span className="text-red-400">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：DeepSeek"
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none focus:border-amber"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                模型名 <span className="text-red-400">*</span>
              </label>
              <input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="如：deepseek-chat / gpt-4o-mini"
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none focus:border-amber"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                API 地址 <span className="text-red-400">*</span>
              </label>
              <input
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="如：https://api.deepseek.com"
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none focus:border-amber"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
                API 密钥 <span className="text-red-400">*</span>
              </label>
              <input
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder={editId ? "留空则保持原有密钥" : "sk-..."}
                type="password"
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm outline-none focus:border-amber"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-[rgb(var(--border))]"
            />
            <label htmlFor="isActive" className="text-sm">添加后立即启用</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); }}
              className="rounded-lg border border-[rgb(var(--border))] px-4 py-2 text-sm transition-colors hover:bg-[rgb(var(--muted))]"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber px-4 py-2 text-sm font-medium text-night transition-colors hover:bg-amber-bright"
            >
              {editId ? "保存修改" : "添加提供商"}
            </button>
          </div>
        </form>
      )}

      {/* 列表 */}
      {providers.length === 0 ? (
        <div className="theme-card p-8 text-center">
          <p className="text-sm text-[rgb(var(--muted-foreground))]">
            暂无 AI 提供商配置
          </p>
          <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
            点击右上角「新增提供商」添加
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className={`theme-card flex items-center gap-4 p-4 transition-all ${
                p.isActive ? "border-amber/50 ring-1 ring-amber/20" : ""
              }`}
            >
              {/* 活跃标识 */}
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${
                p.isActive ? "bg-amber/20 text-amber-bright" : "bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]"
              }`}>
                🤖
              </div>

              {/* 信息 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{p.name}</h3>
                  {p.isActive && (
                    <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-medium text-amber-bright">
                      使用中
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[rgb(var(--muted-foreground))]">
                  <span>模型: {p.model}</span>
                  <span>密钥: {p.apiKey}</span>
                </div>
              </div>

              {/* 操作 */}
              <div className="flex shrink-0 items-center gap-1.5">
                {!p.isActive && (
                  <button
                    type="button"
                    onClick={() => handleActivate(p.id)}
                    className="rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-medium transition-colors hover:border-amber hover:text-amber-bright"
                    title="切换为使用此提供商"
                  >
                    启用
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-xs transition-colors hover:bg-[rgb(var(--muted))]"
                  title="编辑"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-xs transition-colors hover:border-red-500 hover:text-red-400"
                  title="删除"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 使用提示 */}
      <div className="mt-6 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 text-xs text-[rgb(var(--muted-foreground))]">
        <p className="font-medium mb-1">💡 使用说明</p>
        <ul className="list-inside list-disc space-y-0.5">
          <li>添加 AI 提供商后，AI 助手将自动使用您配置的 API</li>
          <li>多个提供商可以同时存在，但只能 <strong>启用一个</strong> 作为活跃提供商</li>
          <li>API 密钥存储在数据库中，不会在前端明文显示</li>
          <li>如果未配置任何提供商，将自动退回到 <code className="rounded bg-[rgb(var(--muted))] px-1">DEEPSEEK_API_KEY</code> 环境变量</li>
        </ul>
      </div>
    </div>
  );
}