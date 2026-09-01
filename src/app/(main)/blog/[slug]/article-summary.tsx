"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Copy, Check } from "lucide-react";

interface ArticleSummaryProps {
  slug: string;
  initialSummary: string | null;
}

export function ArticleSummary({ slug, initialSummary }: ArticleSummaryProps) {
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 生成摘要
  const generateSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${slug}/summary`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成失败");
      }

      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成摘要失败");
    } finally {
      setLoading(false);
    }
  };

  // 复制摘要
  const copySummary = async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 复制失败静默处理
    }
  };

  return (
    <div className="mb-8 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-bright" />
          <h3 className="font-medium text-[rgb(var(--foreground))]">
            AI 摘要
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {summary && (
            <button
              onClick={copySummary}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] transition-colors"
              title="复制摘要"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "已复制" : "复制"}
            </button>
          )}

          {!summary && !loading && (
            <button
              onClick={generateSummary}
              className="flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              生成摘要
            </button>
          )}

          {summary && !loading && (
            <button
              onClick={generateSummary}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] transition-colors"
              title="重新生成"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-sm text-[rgb(var(--muted-foreground))]">
          <div className="flex gap-1">
            <span className="h-2 w-2 bg-amber-bright rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="h-2 w-2 bg-amber-bright rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="h-2 w-2 bg-amber-bright rounded-full animate-bounce"></span>
          </div>
          正在生成摘要...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <span>{error}</span>
          <button
            onClick={generateSummary}
            className="text-xs underline hover:text-red-400 transition-colors"
          >
            重试
          </button>
        </div>
      )}

      {summary && !loading && (
        <p className="text-sm leading-relaxed text-[rgb(var(--muted-foreground))]">
          {summary}
        </p>
      )}
    </div>
  );
}
