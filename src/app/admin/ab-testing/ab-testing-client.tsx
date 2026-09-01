"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Plus,
  Play,
  Pause,
  CheckCircle,
  BarChart3,
  FlaskConical,
  Users,
  TrendingUp,
  Download,
} from "lucide-react";

// ============================================================
// 类型
// ============================================================

interface Experiment {
  id: string;
  name: string;
  description: string;
  status: "draft" | "running" | "paused" | "completed";
  variants: Variant[];
  targetPages: string[];
  startDate: string;
  endDate?: string;
  trafficAllocation: number;
}

interface Variant {
  id: string;
  name: string;
  description: string;
  weight: number;
}

interface VariantStats {
  variantId: string;
  name: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  averageValue: number;
}

interface ExperimentStats {
  experimentId: string;
  variants: VariantStats[];
  totalVisitors: number;
  totalConversions: number;
  confidence: number;
}

// ============================================================
// 组件
// ============================================================

export function ABTestingClient() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [stats, setStats] = useState<ExperimentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  // 加载实验列表
  const fetchExperiments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/ab-testing?action=list");
      if (!res.ok) throw new Error("获取实验列表失败");
      const data = await res.json();
      setExperiments(data.experiments || []);
    } catch (error) {
      console.error("加载实验列表失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  // 加载实验统计
  const fetchStats = useCallback(async (experimentId: string) => {
    try {
      setStatsLoading(true);
      const res = await fetch(`/api/admin/ab-testing?action=stats&id=${experimentId}`);
      if (!res.ok) throw new Error("获取统计失败");
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error("加载统计失败:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 选择实验
  const selectExperiment = useCallback(
    (experiment: Experiment) => {
      setSelectedExperiment(experiment);
      fetchStats(experiment.id);
    },
    [fetchStats]
  );

  // 更新实验状态
  const updateStatus = useCallback(
    async (experimentId: string, status: Experiment["status"]) => {
      try {
        const res = await fetch("/api/admin/ab-testing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-status",
            experimentId,
            status,
          }),
        });

        if (!res.ok) throw new Error("更新状态失败");

        // 刷新列表
        await fetchExperiments();

        // 如果是当前选中的实验，更新状态
        if (selectedExperiment?.id === experimentId) {
          setSelectedExperiment((prev) =>
            prev ? { ...prev, status } : null
          );
        }
      } catch (error) {
        console.error("更新状态失败:", error);
      }
    },
    [fetchExperiments, selectedExperiment]
  );

  // 导出报告
  const exportReport = useCallback(
    async (format: "csv" | "json" = "csv") => {
      if (!selectedExperiment) return;

      try {
        const url = `/api/admin/ab-testing/export?id=${selectedExperiment.id}&format=${format}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error("导出失败");

        const blob = await res.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;

        // 从 Content-Disposition 获取文件名
        const disposition = res.headers.get("Content-Disposition");
        const filenameMatch = disposition?.match(/filename="(.+)"/);
        link.download =
          filenameMatch?.[1] ||
          `AB测试报告_${selectedExperiment.name}_${new Date().toISOString().slice(0, 10)}.${format}`;

        link.click();
        URL.revokeObjectURL(downloadUrl);
      } catch (error) {
        console.error("导出报告失败:", error);
      }
    },
    [selectedExperiment]
  );

  // 获取状态颜色
  const getStatusColor = (status: Experiment["status"]) => {
    switch (status) {
      case "running":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "paused":
        return "bg-amber/10 text-amber border-amber/20";
      case "completed":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))]";
    }
  };

  // 获取状态文本
  const getStatusText = (status: Experiment["status"]) => {
    switch (status) {
      case "running":
        return "运行中";
      case "paused":
        return "已暂停";
      case "completed":
        return "已完成";
      default:
        return "草稿";
    }
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
          <h1 className="font-serif text-2xl font-bold">A/B 测试</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchExperiments}
            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-1.5 text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright transition-colors"
            title="刷新"
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

      {/* 内容 */}
      {!loading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 实验列表 */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium">实验列表</h2>
                <span className="text-xs text-[rgb(var(--muted-foreground))]">
                  {experiments.length} 个实验
                </span>
              </div>

              {experiments.length === 0 ? (
                <div className="py-8 text-center text-sm text-[rgb(var(--muted-foreground))]">
                  <FlaskConical className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  暂无实验
                </div>
              ) : (
                <div className="space-y-2">
                  {experiments.map((experiment) => (
                    <button
                      key={experiment.id}
                      onClick={() => selectExperiment(experiment)}
                      className={`w-full rounded-lg border p-3 text-left transition-all ${
                        selectedExperiment?.id === experiment.id
                          ? "border-amber bg-amber/10"
                          : "border-[rgb(var(--border))] hover:border-amber/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {experiment.name}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusColor(
                            experiment.status
                          )}`}
                        >
                          {getStatusText(experiment.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))] line-clamp-2">
                        {experiment.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 实验详情 */}
          <div className="lg:col-span-2">
            {selectedExperiment ? (
              <div className="space-y-6">
                {/* 实验信息 */}
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {selectedExperiment.name}
                      </h2>
                      <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
                        {selectedExperiment.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedExperiment.status === "draft" && (
                        <button
                          onClick={() =>
                            updateStatus(selectedExperiment.id, "running")
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
                        >
                          <Play className="h-3.5 w-3.5" />
                          启动
                        </button>
                      )}
                      {selectedExperiment.status === "running" && (
                        <button
                          onClick={() =>
                            updateStatus(selectedExperiment.id, "paused")
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-bright transition-colors"
                        >
                          <Pause className="h-3.5 w-3.5" />
                          暂停
                        </button>
                      )}
                      {selectedExperiment.status === "paused" && (
                        <button
                          onClick={() =>
                            updateStatus(selectedExperiment.id, "running")
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
                        >
                          <Play className="h-3.5 w-3.5" />
                          恢复
                        </button>
                      )}
                      {(selectedExperiment.status === "running" ||
                        selectedExperiment.status === "paused") && (
                        <button
                          onClick={() =>
                            updateStatus(selectedExperiment.id, "completed")
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          完成
                        </button>
                      )}
                      {/* 导出按钮 */}
                      <div className="relative group">
                        <button className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright transition-colors">
                          <Download className="h-3.5 w-3.5" />
                          导出
                        </button>
                        <div className="absolute right-0 top-full z-10 mt-1 hidden w-32 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] py-1 shadow-lg group-hover:block">
                          <button
                            onClick={() => exportReport("csv")}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-amber/10 hover:text-amber-bright"
                          >
                            导出 CSV
                          </button>
                          <button
                            onClick={() => exportReport("json")}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-amber/10 hover:text-amber-bright"
                          >
                            导出 JSON
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <span className="text-xs text-[rgb(var(--muted-foreground))]">
                        状态
                      </span>
                      <p className="mt-1">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(
                            selectedExperiment.status
                          )}`}
                        >
                          {getStatusText(selectedExperiment.status)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[rgb(var(--muted-foreground))]">
                        流量分配
                      </span>
                      <p className="mt-1 text-sm font-medium">
                        {selectedExperiment.trafficAllocation}%
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[rgb(var(--muted-foreground))]">
                        变体数量
                      </span>
                      <p className="mt-1 text-sm font-medium">
                        {selectedExperiment.variants.length}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[rgb(var(--muted-foreground))]">
                        目标页面
                      </span>
                      <p className="mt-1 text-sm font-medium">
                        {selectedExperiment.targetPages.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 变体列表 */}
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
                  <h3 className="mb-4 text-sm font-medium">变体配置</h3>
                  <div className="space-y-3">
                    {selectedExperiment.variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between rounded-lg bg-[rgb(var(--background))] p-3"
                      >
                        <div>
                          <span className="text-sm font-medium">
                            {variant.name}
                          </span>
                          <p className="text-xs text-[rgb(var(--muted-foreground))]">
                            {variant.description}
                          </p>
                        </div>
                        <span className="text-sm font-mono text-[rgb(var(--muted-foreground))]">
                          {variant.weight}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 统计数据 */}
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-medium">实验统计</h3>
                    {stats && (
                      <span className="text-xs text-[rgb(var(--muted-foreground))]">
                        置信度: {stats.confidence}%
                      </span>
                    )}
                  </div>

                  {statsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-amber" />
                    </div>
                  ) : stats ? (
                    <div className="space-y-4">
                      {/* 概览 */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-lg bg-[rgb(var(--background))] p-3 text-center">
                          <Users className="mx-auto h-5 w-5 text-amber" />
                          <p className="mt-1 text-lg font-bold">
                            {stats.totalVisitors.toLocaleString()}
                          </p>
                          <p className="text-xs text-[rgb(var(--muted-foreground))]">
                            总访客
                          </p>
                        </div>
                        <div className="rounded-lg bg-[rgb(var(--background))] p-3 text-center">
                          <TrendingUp className="mx-auto h-5 w-5 text-emerald-500" />
                          <p className="mt-1 text-lg font-bold">
                            {stats.totalConversions.toLocaleString()}
                          </p>
                          <p className="text-xs text-[rgb(var(--muted-foreground))]">
                            总转化
                          </p>
                        </div>
                        <div className="rounded-lg bg-[rgb(var(--background))] p-3 text-center">
                          <BarChart3 className="mx-auto h-5 w-5 text-blue-500" />
                          <p className="mt-1 text-lg font-bold">
                            {stats.totalVisitors > 0
                              ? (
                                  (stats.totalConversions / stats.totalVisitors) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %
                          </p>
                          <p className="text-xs text-[rgb(var(--muted-foreground))]">
                            整体转化率
                          </p>
                        </div>
                      </div>

                      {/* 变体对比 */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[rgb(var(--border))]">
                              <th className="px-4 py-2 text-left font-medium">
                                变体
                              </th>
                              <th className="px-4 py-2 text-right font-medium">
                                访客
                              </th>
                              <th className="px-4 py-2 text-right font-medium">
                                转化
                              </th>
                              <th className="px-4 py-2 text-right font-medium">
                                转化率
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.variants.map((variant) => (
                              <tr
                                key={variant.variantId}
                                className="border-b border-[rgb(var(--border))] last:border-b-0"
                              >
                                <td className="px-4 py-2 font-medium">
                                  {variant.name}
                                </td>
                                <td className="px-4 py-2 text-right font-mono">
                                  {variant.visitors.toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-right font-mono">
                                  {variant.conversions.toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-right font-mono">
                                  {variant.conversionRate.toFixed(2)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* 置信度提示 */}
                      <div
                        className={`rounded-lg p-3 text-sm ${
                          stats.confidence >= 95
                            ? "bg-emerald-500/10 text-emerald-500"
                            : stats.confidence >= 80
                            ? "bg-amber/10 text-amber"
                            : "bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]"
                        }`}
                      >
                        {stats.confidence >= 95
                          ? "✅ 结果具有统计显著性（置信度 ≥ 95%）"
                          : stats.confidence >= 80
                          ? "⚠️ 结果接近显著（置信度 ≥ 80%），建议继续观察"
                          : "📊 数据不足，需要更多样本才能得出结论"}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-[rgb(var(--muted-foreground))]">
                      暂无统计数据
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card))] p-12 text-center">
                <FlaskConical className="mx-auto mb-4 h-12 w-12 text-[rgb(var(--muted-foreground))]/40" />
                <p className="text-lg font-medium text-[rgb(var(--muted-foreground))]">
                  选择一个实验
                </p>
                <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]/70">
                  从左侧列表中选择一个实验查看详情
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
