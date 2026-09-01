"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Clock,
  FileText,
  Monitor,
  Globe,
  BarChart3,
} from "lucide-react";

// ============================================================
// 类型
// ============================================================

interface HourlyStat {
  hour: number;
  count: number;
}

interface DailyStat {
  date: string;
  count: number;
  visitors: number;
  pageViews: number;
}

interface PageStat {
  page: string;
  count: number;
}

interface DeviceStat {
  name: string;
  count: number;
}

interface RefererStat {
  referer: string;
  count: number;
}

interface DimensionsData {
  hourly: HourlyStat[];
  daily: DailyStat[];
  pages: PageStat[];
  browsers: DeviceStat[];
  os: DeviceStat[];
  referers: RefererStat[];
}

// ============================================================
// 组件
// ============================================================

export function AnalyticsClient({ hideHeader = false }: { hideHeader?: boolean }) {
  const [data, setData] = useState<DimensionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  // 图表引用
  const hourlyChartRef = useRef<HTMLDivElement>(null);
  const dailyChartRef = useRef<HTMLDivElement>(null);
  const browserChartRef = useRef<HTMLDivElement>(null);
  const osChartRef = useRef<HTMLDivElement>(null);

  // 加载数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/stats/dimensions?days=${days}`);
      if (!res.ok) throw new Error("获取数据失败");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 渲染小时分布图
  useEffect(() => {
    if (!data || !hourlyChartRef.current) return;

    let chart: any = null;
    let handleResize: (() => void) | null = null;

    const renderChart = async () => {
      const echarts = await import("echarts");

      // 检查是否已有实例，如果有则销毁
      const existingChart = echarts.getInstanceByDom(hourlyChartRef.current!);
      if (existingChart) {
        existingChart.dispose();
      }

      chart = echarts.init(hourlyChartRef.current);

      const option: any = {
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: "rgba(0,0,0,0.75)",
          borderColor: "transparent",
          textStyle: { color: "#fff", fontSize: 13 },
          formatter: (params: any) => {
            const p = params[0];
            return `<div style="font-weight:600">${p.name}时</div><div>访问量: ${p.value}</div>`;
          },
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "3%",
          top: "10%",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: data.hourly.map((h) => `${h.hour}`),
          axisLabel: {
            fontSize: 11,
            interval: 1,
            formatter: (v: string) => `${v}时`,
          },
        },
        yAxis: {
          type: "value",
          axisLabel: { fontSize: 11 },
          splitLine: { lineStyle: { type: "dashed" } },
        },
        series: [
          {
            name: "访问量",
            type: "bar",
            data: data.hourly.map((h) => h.count),
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "#f59e0b" },
                { offset: 1, color: "#d97706" },
              ]),
              borderRadius: [4, 4, 0, 0],
            },
            barWidth: "60%",
          },
        ],
      };

      chart.setOption(option);

      handleResize = () => chart.resize();
      window.addEventListener("resize", handleResize);
    };

    renderChart();

    return () => {
      if (handleResize) {
        window.removeEventListener("resize", handleResize);
      }
      if (chart) {
        chart.dispose();
      }
    };
  }, [data]);

  // 渲染日趋势图
  useEffect(() => {
    if (!data || !dailyChartRef.current) return;

    let chart: any = null;
    let handleResize: (() => void) | null = null;

    const renderChart = async () => {
      const echarts = await import("echarts");

      // 检查是否已有实例，如果有则销毁
      const existingChart = echarts.getInstanceByDom(dailyChartRef.current!);
      if (existingChart) {
        existingChart.dispose();
      }

      chart = echarts.init(dailyChartRef.current);

      const option: any = {
        tooltip: {
          trigger: "axis",
          backgroundColor: "rgba(0,0,0,0.75)",
          borderColor: "transparent",
          textStyle: { color: "#fff", fontSize: 13 },
          formatter: (params: any) => {
            const p = params[0];
            return `<div style="font-weight:600">${p.name}</div><div>访问量: ${p.value}</div>`;
          },
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "3%",
          top: "10%",
          containLabel: true,
        },
        legend: {
          data: ["访客数", "浏览量"],
          top: "0%",
          textStyle: { fontSize: 12 },
        },
        xAxis: {
          type: "category",
          data: data.daily.map((d) => d.date.slice(5)),
          axisLabel: { fontSize: 11 },
        },
        yAxis: {
          type: "value",
          axisLabel: { fontSize: 11 },
          splitLine: { lineStyle: { type: "dashed" } },
        },
        series: [
          {
            name: "访客数",
            type: "line",
            data: data.daily.map((d) => d.visitors),
            smooth: true,
            symbol: "circle",
            symbolSize: 6,
            lineStyle: {
              color: "#10b981",
              width: 3,
            },
            itemStyle: {
              color: "#10b981",
              borderColor: "#fff",
              borderWidth: 2,
            },
          },
          {
            name: "浏览量",
            type: "line",
            data: data.daily.map((d) => d.pageViews),
            smooth: true,
            symbol: "circle",
            symbolSize: 6,
            lineStyle: {
              color: "#3b82f6",
              width: 3,
            },
            itemStyle: {
              color: "#3b82f6",
              borderColor: "#fff",
              borderWidth: 2,
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(59,130,246,0.3)" },
                { offset: 1, color: "rgba(59,130,246,0.05)" },
              ]),
            },
          },
        ],
      };

      chart.setOption(option);

      handleResize = () => chart.resize();
      window.addEventListener("resize", handleResize);
    };

    renderChart();

    return () => {
      if (handleResize) {
        window.removeEventListener("resize", handleResize);
      }
      if (chart) {
        chart.dispose();
      }
    };
  }, [data]);

  // 渲染浏览器饼图
  useEffect(() => {
    if (!data || !browserChartRef.current) return;

    let chart: any = null;
    let handleResize: (() => void) | null = null;

    const renderChart = async () => {
      const echarts = await import("echarts");

      // 检查是否已有实例，如果有则销毁
      const existingChart = echarts.getInstanceByDom(browserChartRef.current!);
      if (existingChart) {
        existingChart.dispose();
      }

      chart = echarts.init(browserChartRef.current);

      const option: any = {
        tooltip: {
          trigger: "item",
          backgroundColor: "rgba(0,0,0,0.75)",
          borderColor: "transparent",
          textStyle: { color: "#fff", fontSize: 13 },
          formatter: (params: any) => {
            return `<div style="font-weight:600">${params.name}</div><div>访问量: ${params.value} (${params.percent}%)</div>`;
          },
        },
        legend: {
          orient: "vertical",
          right: "5%",
          top: "center",
          textStyle: { fontSize: 12 },
        },
        series: [
          {
            name: "浏览器",
            type: "pie",
            radius: ["40%", "70%"],
            center: ["40%", "50%"],
            avoidLabelOverlap: false,
            label: {
              show: false,
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: "bold",
              },
            },
            data: data.browsers.map((item, index) => ({
              name: item.name,
              value: item.count,
              itemStyle: {
                color: ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444"][index % 5],
              },
            })),
          },
        ],
      };

      chart.setOption(option);

      handleResize = () => chart.resize();
      window.addEventListener("resize", handleResize);
    };

    renderChart();

    return () => {
      if (handleResize) {
        window.removeEventListener("resize", handleResize);
      }
      if (chart) {
        chart.dispose();
      }
    };
  }, [data]);

  // 渲染操作系统饼图
  useEffect(() => {
    if (!data || !osChartRef.current) return;

    let chart: any = null;
    let handleResize: (() => void) | null = null;

    const renderChart = async () => {
      const echarts = await import("echarts");

      // 检查是否已有实例，如果有则销毁
      const existingChart = echarts.getInstanceByDom(osChartRef.current!);
      if (existingChart) {
        existingChart.dispose();
      }

      chart = echarts.init(osChartRef.current);

      const option: any = {
        tooltip: {
          trigger: "item",
          backgroundColor: "rgba(0,0,0,0.75)",
          borderColor: "transparent",
          textStyle: { color: "#fff", fontSize: 13 },
          formatter: (params: any) => {
            return `<div style="font-weight:600">${params.name}</div><div>访问量: ${params.value} (${params.percent}%)</div>`;
          },
        },
        legend: {
          orient: "vertical",
          right: "5%",
          top: "center",
          textStyle: { fontSize: 12 },
        },
        series: [
          {
            name: "操作系统",
            type: "pie",
            radius: ["40%", "70%"],
            center: ["40%", "50%"],
            avoidLabelOverlap: false,
            label: {
              show: false,
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: "bold",
              },
            },
            data: data.os.map((item, index) => ({
              name: item.name,
              value: item.count,
              itemStyle: {
                color: ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444"][index % 5],
              },
            })),
          },
        ],
      };

      chart.setOption(option);

      handleResize = () => chart.resize();
      window.addEventListener("resize", handleResize);
    };

    renderChart();

    return () => {
      if (handleResize) {
        window.removeEventListener("resize", handleResize);
      }
      if (chart) {
        chart.dispose();
      }
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 顶部 */}
      {!hideHeader && (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold">访客分析</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* 手动刷新 */}
            <button
              onClick={fetchData}
              className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-1.5 text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright transition-colors"
              title="刷新数据"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            {/* 时间筛选 */}
            {[
              { label: "7天", value: 7 },
              { label: "30天", value: 30 },
              { label: "90天", value: 90 },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  days === opt.value
                    ? "bg-amber text-white"
                    : "border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber" />
          <span className="ml-3 text-[rgb(var(--muted-foreground))]">
            加载中...
          </span>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-600">
          {error}
        </div>
      )}

      {/* 数据展示 */}
      {data && !loading && (
        <div className="space-y-6">
          {/* 总览卡片 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {(() => {
              const totalPageViews = data.daily.reduce((sum, d) => sum + d.pageViews, 0);
              const totalVisitors = data.daily.reduce((sum, d) => sum + d.visitors, 0);
              const avgPageViews = data.daily.length > 0 ? Math.round(totalPageViews / data.daily.length) : 0;
              const topPage = data.pages[0];
              const cards = [
                { label: "总浏览量", value: totalPageViews.toLocaleString() },
                { label: "总访客数", value: totalVisitors.toLocaleString() },
                { label: "日均浏览量", value: avgPageViews.toLocaleString() },
                { label: "最热门页面", value: topPage ? topPage.page : "-" },
              ];
              return cards.map((card, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4"
                >
                  <p className="text-xs text-[rgb(var(--muted-foreground))]">{card.label}</p>
                  <p className={`mt-1 font-medium ${card.label === "最热门页面" ? "truncate font-mono text-xs" : "text-xl font-bold"}`}>
                    {card.value}
                  </p>
                </div>
              ));
            })()}
          </div>

          {/* 时间分析 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 小时分布 */}
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber" />
                <h2 className="text-sm font-medium">24 小时访问分布</h2>
              </div>
              <div ref={hourlyChartRef} className="h-[250px] w-full" />
            </div>

            {/* 日趋势 */}
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-medium">访问趋势</h2>
              </div>
              <div ref={dailyChartRef} className="h-[250px] w-full" />
            </div>
          </div>

          {/* 设备分析 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 浏览器分布 */}
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-medium">浏览器分布</h2>
              </div>
              <div ref={browserChartRef} className="h-[250px] w-full" />
            </div>

            {/* 操作系统分布 */}
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Monitor className="h-4 w-4 text-purple-500" />
                <h2 className="text-sm font-medium">操作系统分布</h2>
              </div>
              <div ref={osChartRef} className="h-[250px] w-full" />
            </div>
          </div>

          {/* 热门页面 */}
          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber" />
              <h2 className="text-sm font-medium">热门页面 TOP 20</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgb(var(--border))]">
                    <th className="px-4 py-2 text-left font-medium">排名</th>
                    <th className="px-4 py-2 text-left font-medium">页面路径</th>
                    <th className="px-4 py-2 text-right font-medium">访问量</th>
                    <th className="px-4 py-2 text-right font-medium">占比</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pages.map((page, index) => {
                    const total = data.pages.reduce((sum, p) => sum + p.count, 0);
                    const percentage = ((page.count / total) * 100).toFixed(1);

                    return (
                      <tr
                        key={`${page.page}-${index}`}
                        className="border-b border-[rgb(var(--border))] last:border-b-0 hover:bg-[rgb(var(--muted))]/50"
                      >
                        <td className="px-4 py-2">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                              index < 3
                                ? "bg-amber/20 text-amber-bright"
                                : "bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]"
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="max-w-[300px] truncate px-4 py-2 font-mono text-xs">
                          {page.page}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {page.count.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right text-[rgb(var(--muted-foreground))]">
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 来源分析 */}
          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-medium">访问来源 TOP 20</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.referers.map((referer, index) => (
                <div
                  key={`${referer.referer}-${index}`}
                  className="flex items-center justify-between rounded-lg bg-[rgb(var(--background))] px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                        index < 3
                          ? "bg-amber/20 text-amber-bright"
                          : "bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm truncate">{referer.referer}</span>
                  </div>
                  <span className="font-mono text-xs text-[rgb(var(--muted-foreground))] flex-shrink-0 ml-2">
                    {referer.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
