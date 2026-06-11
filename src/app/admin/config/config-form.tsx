"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// 配置项定义
// ============================================================

type ConfigField = {
  key: string;
  label: string;
  description: string;
  type: "text" | "number" | "switch" | "tags";
  defaultValue: string;
  min?: number;
  max?: number;
};

const CONFIG_FIELDS: ConfigField[] = [
  {
    key: "site_title",
    label: "网站标题",
    description: "显示在浏览器标签页和页面头部",
    type: "text",
    defaultValue: "TechBlog Labs",
  },
  {
    key: "site_description",
    label: "网站描述",
    description: "SEO 描述，显示在搜索结果中",
    type: "text",
    defaultValue: "技术博客与创意实验室",
  },
  {
    key: "seo_keywords",
    label: "SEO 关键词",
    description: "多个关键词用逗号分隔",
    type: "tags",
    defaultValue: "技术博客,编程,Next.js,React",
  },
  {
    key: "posts_per_page",
    label: "每页文章数",
    description: "博客列表每页显示的文章数量",
    type: "number",
    defaultValue: "9",
    min: 1,
    max: 50,
  },
  {
    key: "comments_per_page",
    label: "每页评论数",
    description: "评论区每页显示的评论数量",
    type: "number",
    defaultValue: "20",
    min: 1,
    max: 50,
  },
  {
    key: "enable_comments",
    label: "全局评论开关",
    description: "关闭后所有文章将不显示评论区",
    type: "switch",
    defaultValue: "true",
  },
  {
    key: "enable_likes",
    label: "全局点赞开关",
    description: "关闭后所有文章将不显示点赞按钮",
    type: "switch",
    defaultValue: "true",
  },
];

// ============================================================
// Switch 组件
// ============================================================

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-primary-600" : "bg-[rgb(var(--border))]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ============================================================
// 主组件
// ============================================================

export function ConfigForm({ initialConfig }: { initialConfig: Record<string, string> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [config, setConfig] = useState(initialConfig);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function updateField(key: string, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setMessage({ type: "error", text: data.message || "保存失败" });
          return;
        }

        setMessage({ type: "success", text: "配置已保存" });
        router.refresh();
        setTimeout(() => setMessage(null), 2500);
      } catch {
        setMessage({ type: "error", text: "网络错误，请重试" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 消息提示 */}
      {message && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
              : "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 配置项列表 */}
      <div className="space-y-6">
        {CONFIG_FIELDS.map((field) => (
          <ConfigFieldRow
            key={field.key}
            field={field}
            value={config[field.key] ?? field.defaultValue}
            onChange={(v) => updateField(field.key, v)}
          />
        ))}
      </div>

      {/* 保存按钮 */}
      <div className="mt-8 border-t border-[rgb(var(--border))] pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="btn-shimmer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "保存中..." : "保存配置"}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// 单行配置项
// ============================================================

function ConfigFieldRow({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <label className="text-sm font-medium">{field.label}</label>
          <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
            {field.description}
          </p>
        </div>

        <div className="shrink-0">
          {field.type === "text" && (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-48 sm:w-64 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          )}

          {field.type === "number" && (
            <input
              type="number"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              min={field.min}
              max={field.max}
              className="w-24 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          )}

          {field.type === "tags" && (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="用逗号分隔"
              className="w-48 sm:w-64 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          )}

          {field.type === "switch" && (
            <Switch
              checked={value === "true"}
              onChange={(v) => onChange(v ? "true" : "false")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
