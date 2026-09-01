"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  HardDrive,
  Trash2,
  RotateCcw,
  Search,
} from "lucide-react";

// ============================================================
// 类型
// ============================================================

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: string;
}

interface CacheKey {
  key: string;
  ttl: number;
}

interface CacheData {
  stats: CacheStats;
  keys: CacheKey[];
  timestamp: string;
}

// ============================================================
// 组件
// ============================================================

export function CacheClient() {
  const [data, setData] = useState<CacheData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // 加载数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/cache");
      if (!res.ok) throw new Error("获取缓存数据失败");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("加载缓存数据失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 重置统计
  const resetStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-stats" }),
      });

      if (!res.ok) throw new Error("重置统计失败");
      await fetchData();
    } catch (error) {
      console.error("重置统计失败:", error);
    }
  }, [fetchData]);

  // 清除指定模式缓存
  const clearPattern = useCallback(
    async (pattern: string) => {
      if (!confirm(`确定要清除匹配 "${pattern}" 的缓存吗？`)) return;

      try {
        const res = await fetch("/api/admin/cache", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clear-pattern", pattern }),
        });

        if (!res.ok) throw new Error("清除缓存失败");
        await fetchData();
      } catch (error) {
        console.error("清除缓存失败:", error);
      }
    },
    [fetchData]
  );

  // 清除所有缓存
  const clearAll = useCallback(async () => {
    if (!confirm("确定要清除所有缓存吗？这可能会影响性能。")) return;

    try {
      const res = await fetch("/api/admin/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-all" }),
      });

      if (!res.ok) throw new Error("清除缓存失败");
      await fetchData();
    } catch (error) {
      console.error("清除缓存失败:", error);
    }
  }, [fetchData]);

  // 过滤键
  const filteredKeys =
    data?.keys.filter((k) =>
      k.key.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  // 获取命中率颜色
  const getHitRateColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-500";
    if (rate >= 50) return "text-amber";
    return "text-rose-500";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 顶部 */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-[rgb(var(--muted-foreground))] hover:text-amber-bright transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回后台
          </Link>
          <h1 className="font-serif text-2xl font-bold">缓存监控</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetStats}
            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={clearAll}
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-500/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={fetchData}
            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-1.5 text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber" />
          <span className="ml-3 text-[rgb(var(--muted-foreground))]">
            加载中...
          </span>
        </div>
      )}

      {/* 数据展示 */}
      {data && !loading && (
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-amber" />
                <span className="text-sm font-medium">命中率</span>
              </div>
              <p className={`mt-2 text-3xl font-bold ${getHitRateColor(data.stats.hitRate)}`}>
                {data.stats.hitRate.toFixed(1)}%
              </p>
            </div>

            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <p className="text-sm text-[rgb(var(--muted-foreground))]">命中次数</p>
              <p className="mt-2 text-3xl font-bold text-emerald-500">
                {data.stats.hits.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <p className="text-sm text-[rgb(var(--muted-foreground))]">未命中次数</p>
              <p className="mt-2 text-3xl font-bold text-rose-500">
                {data.stats.misses.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <p className="text-sm text-[rgb(var(--muted-foreground))]">缓存键数</p>
              <p className="mt-2 text-3xl font-bold text-blue-500">
                {data.stats.totalKeys}
              </p>
              <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                内存: {data.stats.memoryUsage}
              </p>
            </div>
          </div>

          {/* 缓存键列表 */}
          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium">缓存键列表</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
                <input
                  type="text"
                  placeholder="搜索键..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber/50"
                />
              </div>
            </div>

            {filteredKeys.length === 0 ? (
              <p className="py-8 text-center text-sm text-[rgb(var(--muted-foreground))]">
                {searchTerm ? "没有匹配的缓存键" : "暂无缓存数据"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgb(var(--border))]">
                      <th className="px-4 py-2 text-left font-medium">键名</th>
                      <th className="px-4 py-2 text-right font-medium">TTL</th>
                      <th className="px-4 py-2 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKeys.map((item) => (
                      <tr
                        key={item.key}
                        className="border-b border-[rgb(var(--border))] last:border-b-0"
                      >
                        <td className="px-4 py-2 font-mono text-xs">
                          {item.key}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {item.ttl === -1
                            ? "永不过期"
                            : item.ttl === -2
                            ? "已过期"
                            : `${item.ttl}s`}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => clearPattern(item.key)}
                            className="rounded p-1 text-[rgb(var(--muted-foreground))] hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
