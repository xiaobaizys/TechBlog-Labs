"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
} from "lucide-react";

// ============================================================
// 类型
// ============================================================

interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: string;
  message: string;
  acknowledged: boolean;
}

// ============================================================
// 组件
// ============================================================

export function AlertsClient() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unacknowledged">("all");

  // 加载告警历史
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/alerts?action=history&limit=100");
      if (!res.ok) throw new Error("获取告警历史失败");
      const data = await res.json();
      setAlerts(data.history || []);
    } catch (error) {
      console.error("加载告警历史失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // 运行告警检查
  const runCheck = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/alerts?action=check");
      if (!res.ok) throw new Error("运行告警检查失败");
      const data = await res.json();

      if (data.count > 0) {
        alert(`发现 ${data.count} 个新告警！`);
      } else {
        alert("未发现新告警");
      }

      // 刷新列表
      await fetchAlerts();
    } catch (error) {
      console.error("运行告警检查失败:", error);
    }
  }, [fetchAlerts]);

  // 确认告警
  const acknowledgeAlert = useCallback(
    async (alertId: string) => {
      try {
        const res = await fetch("/api/admin/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "acknowledge",
            alertId,
          }),
        });

        if (!res.ok) throw new Error("确认告警失败");

        // 更新本地状态
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alertId ? { ...a, acknowledged: true } : a
          )
        );
      } catch (error) {
        console.error("确认告警失败:", error);
      }
    },
    []
  );

  // 过滤告警
  const filteredAlerts =
    filter === "unacknowledged"
      ? alerts.filter((a) => !a.acknowledged)
      : alerts;

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
          <h1 className="font-serif text-2xl font-bold">告警历史</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* 筛选 */}
          <button
            onClick={() =>
              setFilter(filter === "all" ? "unacknowledged" : "all")
            }
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === "unacknowledged"
                ? "bg-amber text-white"
                : "border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))]"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
          </button>

          {/* 运行检查 */}
          <button
            onClick={runCheck}
            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright transition-colors"
          >
            运行检查
          </button>

          {/* 刷新 */}
          <button
            onClick={fetchAlerts}
            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-1.5 text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 统计 */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <p className="text-sm text-[rgb(var(--muted-foreground))]">总告警数</p>
          <p className="mt-1 text-2xl font-bold">{alerts.length}</p>
        </div>
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <p className="text-sm text-[rgb(var(--muted-foreground))]">未确认</p>
          <p className="mt-1 text-2xl font-bold text-amber">
            {alerts.filter((a) => !a.acknowledged).length}
          </p>
        </div>
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <p className="text-sm text-[rgb(var(--muted-foreground))]">已确认</p>
          <p className="mt-1 text-2xl font-bold text-emerald-500">
            {alerts.filter((a) => a.acknowledged).length}
          </p>
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

      {/* 告警列表 */}
      {!loading && (
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-[rgb(var(--muted-foreground))]/40" />
              <p className="text-[rgb(var(--muted-foreground))]">
                {filter === "unacknowledged"
                  ? "没有未确认的告警"
                  : "暂无告警记录"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[rgb(var(--border))]">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 ${
                    alert.acknowledged
                      ? "bg-[rgb(var(--background))]"
                      : "bg-amber/5"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 rounded-full p-1.5 ${
                          alert.acknowledged
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-amber/10 text-amber"
                        }`}
                      >
                        {alert.acknowledged ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">
                          {alert.ruleName}
                        </h3>
                        <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                          {alert.message}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-[rgb(var(--muted-foreground))]">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(alert.timestamp).toLocaleString("zh-CN")}
                          </span>
                          <span>
                            指标: {alert.metric}
                          </span>
                          <span>
                            当前值: {alert.currentValue} / 阈值: {alert.threshold}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--muted-foreground))] hover:border-emerald-500 hover:text-emerald-500 transition-colors"
                      >
                        确认
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
