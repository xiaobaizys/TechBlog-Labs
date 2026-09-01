"use client";

import { useState } from "react";
import { Send, Loader2, Check, AlertCircle } from "lucide-react";

interface FormData {
  name: string;
  url: string;
  avatar: string;
  description: string;
  category: string;
  contact: string;
  message: string;
}

const initialFormData: FormData = {
  name: "",
  url: "",
  avatar: "",
  description: "",
  category: "",
  contact: "",
  message: "",
};

const CATEGORY_OPTIONS = [
  "技术博客",
  "个人博客",
  "工具网站",
  "开源项目",
  "设计资源",
  "学习资源",
  "其他",
];

export function FriendLinkApplyForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.url) {
      setMessage({ type: "error", text: "网站名称和链接不能为空" });
      return;
    }

    // 验证 URL 格式
    try {
      new URL(formData.url);
    } catch {
      setMessage({ type: "error", text: "请输入有效的网站链接" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/friends/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: data.message || "申请已提交" });
        setFormData(initialFormData);
        // 3秒后关闭表单
        setTimeout(() => {
          setIsOpen(false);
          setMessage(null);
        }, 3000);
      } else {
        setMessage({ type: "error", text: data.message || "提交失败" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "网络错误，请稍后重试" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">申请友情链接</h3>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">
            如果您有优质的网站或博客，欢迎申请交换友情链接
          </p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 rounded-lg bg-amber px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-bright"
        >
          <Send className="h-4 w-4" />
          {isOpen ? "收起" : "申请友链"}
        </button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div
          className={`mb-4 flex items-center gap-3 rounded-lg border p-4 ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <Check className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 表单 */}
      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 网站名称 */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                网站名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
                placeholder="输入网站名称"
                required
              />
            </div>

            {/* 网站链接 */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                网站链接 <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
                placeholder="https://example.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 头像 URL */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                头像/Logo URL
              </label>
              <input
                type="url"
                value={formData.avatar}
                onChange={(e) =>
                  setFormData({ ...formData, avatar: e.target.value })
                }
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
                placeholder="https://example.com/avatar.png"
              />
              <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                不填将自动获取网站 favicon
              </p>
            </div>

            {/* 分类 */}
            <div>
              <label className="mb-2 block text-sm font-medium">分类</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
              >
                <option value="">选择分类</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 网站描述 */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              网站描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
              placeholder="简短描述网站内容（建议 50 字以内）"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 联系方式 */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                联系方式
              </label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) =>
                  setFormData({ ...formData, contact: e.target.value })
                }
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
                placeholder="邮箱或社交账号"
              />
            </div>

            {/* 留言 */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                申请留言
              </label>
              <input
                type="text"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
                placeholder="可选，留下想说的话"
              />
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-amber px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-bright disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {loading ? "提交中..." : "提交申请"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
