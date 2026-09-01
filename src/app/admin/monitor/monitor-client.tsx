"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Server,
  Database,
  HardDrive,
  Activity,
  AlertTriangle,
  Clock,
  Cpu,
  MemoryStick,
  Zap,
} from "lucide-react";

// ============================================================
// 类型
// ============================================================

interface MonitorData {
  system: {
    hostname: string;
    platform: string;
    arch: string;
    nodeVersion: string;
    cpu: {
      model: string;
      cores: number;
      usage: number;
    };
    memory: {
      total: string;
      free: string;
      used: string;
      usagePercent: number;
    };
    uptime: string;
    uptimeSeconds: number;
  };
  database: {
    totalVisits: number;
    todayVisits: number;
    totalPosts: number;
    totalUsers: number;
    totalComments: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    totalKeys: number;
    memoryUsage: string;
  };
  alerts: Array<{
    id: string;
    ruleName: string;
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
  realtime: {
    last5Minutes: number;
    lastHour: number;
    requestsPerMinute: number;
    hourlyAverageRpm: number;
  };
  timestamp: string;
}

// ============================================================
// 组件
// ============================================================

export function MonitorClient() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 加载数据
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/monitor");
      if (!res.ok) throw new Error("获取监控数据失败");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("加载监控数据失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(fetchData, 10000); // 每 10 秒刷新
    return () => clearInterval(timer);
  }, [autoRefresh, fetchData]);

  // 获取 CPU/内存颜色
  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "text-rose-500";
    if (percent >= 70) return "text-amber";
    return "text-emerald-500";
  };

  const getUsageBgColor = (percent: number) => {
    if (percent >= 90) return "bg-rose-500";
    if (percent >= 70) return "bg-amber";
    return "bg-emerald-500";
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
          <h1 className="font-serif text-2xl font-bold">系统监控</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              autoRefresh
                ? "bg-emerald-500 text-white"
                : "border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))]"
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
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
          {/* 系统信息 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* CPU 使用率 */}
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-amber" />
                  <span className="text-sm font-medium">CPU 使用率</span>
                </div>
                <span className={`text-2xl font-bold ${getUsageColor(data.system.cpu.usage)}`}>
                  {data.system.cpu.usage}%
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-[rgb(var(--muted))]">
                <div
                  className={`h-2 rounded-full transition-all ${getUsageBgColor(data.system.cpu.usage)}`}
                  style={{ width: `${data.system.cpu.usage}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">
                {data.system.cpu.cores} 核心 · {data.system.cpu.model.slice(0, 30)}
              </p>
            </div>

            {/* 内存使用率 */}
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MemoryStick className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">内存使用率</span>
                </div>
                <span className={`text-2xl font-bold ${getUsageColor(data.system.memory.usagePercent)}`}>
                  {data.system.memory.usagePercent}%
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-[rgb(var(--muted))]">
                <div
                  className={`h-2 rounded-full transition-all ${getUsageBgColor(data.system.memory.usagePercent)}`}
                  style={{ width: `${data.system.memory.usagePercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">
                {data.system.memory.used} / {data.system.memory.total}
              </p>
            </div>

            {/* 服务器运行时间 */}
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium">运行时间</span>
              </div>
              <p className="mt-2 text-lg font-bold">{data.system.uptime}</p>
              <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                {data.system.platform} · {data.system.arch}
              </p>
            </div>

            {/* 实时请求 */}
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber" />
                <span className="text-sm font-medium">实时请求</span>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {data.realtime.requestsPerMinute}
              </p>
              <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                次/分钟 · 最近5分钟 {data.realtime.last5Minutes} 次
              </p>
            </div>
          </div>

          {/* 数据库统计 */}
          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-amber" />
              <h2 className="text-sm font-medium">数据库统计</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="rounded-lg bg-[rgb(var(--background))] p-4 text-center">
                <p className="text-2xl font-bold text-amber">
                  {data.database.totalVisits.toLocaleString()}
                </p>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  总访问量
                </p>
              </div>
              <div className="rounded-lg bg-[rgb(var(--background))] p-4 text-center">
                <p className="text-2xl font-bold text-emerald-500">
                  {data.database.todayVisits.toLocaleString()}
                </p>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  今日访问
                </p>
              </div>
              <div className="rounded-lg bg-[rgb(var(--background))] p-4 text-center">
                <p className="text-2xl font-bold text-blue-500">
                  {data.database.totalPosts}
                </p>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  文章数量
                </p>
              </div>
              <div className="rounded-lg bg-[rgb(var(--background))] p-4 text-center">
                <p className="text-2xl font-bold text-purple-500">
                  {data.database.totalUsers}
                </p>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  注册用户
                </p>
              </div>
              <div className="rounded-lg bg-[rgb(var(--background))] p-4 text-center">
                <p className="text-2xl font-bold text-rose-500">
                  {data.database.totalComments}
                </p>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  评论数量
                </p>
              </div>
            </div>
          </div>

          {/* 缓存统计 */}
          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
            <div className="mb-4 flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-blue-500" />
              <h2 className="text-sm font-medium">Redis 缓存</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-[rgb(var(--background))] p-4 text-center">
                <p className="text-2xl font-bold text-emerald-500">
                  {data.cache.hits.toLocaleString()}
                </p>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  缓存命中
                </p>
              </div>
              <div className="rounded-lg bg-[rgb(var(--background))] p-4 text-center">
                <p className="text-2xl font-bold text-rose-500">
                  {data.cache.misses.toLocaleString()}
                </p>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  缓存未命中
                </p>
              </div>
              <div className="rounded-lg bg-[rgb(var(--background))] p-4 text-center">
                <p className="text-2xl font-bold text-amber">
                  {data.cache.hitRate.toFixed(1)}%
                </p>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  命中率
                </p>
              </div>
              <div className="rounded-lg bg-[rgb(var(--background))] p-4 text-center">
                <p className="text-2xl font-bold text-blue-500">
                  {data.cache.totalKeys}
                </p>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  缓存键数
                </p>
              </div>
            </div>
          </div>

          {/* 最近告警 */}
          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber" />
              <h2 className="text-sm font-medium">最近告警</h2>
            </div>
            {data.alerts.length === 0 ? (
              <p className="py-4 text-center text-sm text-[rgb(var(--muted-foreground))]">
                暂无告警记录
              </p>
            ) : (
              <div className="space-y-2">
                {data.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg border p-3 ${
                      alert.acknowledged
                        ? "border-[rgb(var(--border))] bg-[rgb(var(--background))]"
                        : "border-amber/30 bg-amber/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{alert.ruleName}</span>
                      <span className="text-xs text-[rgb(var(--muted-foreground))]">
                        {new Date(alert.timestamp).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                      {alert.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 系统信息 */}
          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Server className="h-5 w-5 text-emerald-500" />
              <h2 className="text-sm font-medium">系统信息</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[rgb(var(--muted-foreground))]">主机名</span>
                  <span className="text-sm font-mono">{data.system.hostname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[rgb(var(--muted-foreground))]">平台</span>
                  <span className="text-sm font-mono">{data.system.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[rgb(var(--muted-foreground))]">架构</span>
                  <span className="text-sm font-mono">{data.system.arch}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[rgb(var(--muted-foreground))]">Node.js</span>
                  <span className="text-sm font-mono">{data.system.nodeVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[rgb(var(--muted-foreground))]">Redis 内存</span>
                  <span className="text-sm font-mono">{data.cache.memoryUsage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[rgb(var(--muted-foreground))]">更新时间</span>
                  <span className="text-sm font-mono">
                    {new Date(data.timestamp).toLocaleTimeString("zh-CN")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
