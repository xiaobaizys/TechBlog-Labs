"use client";

import { useEffect, useRef } from "react";

// ============================================================
// 类型
// ============================================================

interface HeatmapData {
  hour: number;
  day: number;
  value: number;
}

interface FunnelData {
  name: string;
  value: number;
}

interface SankeeData {
  nodes: { name: string }[];
  links: { source: string; target: string; value: number }[];
}

// ============================================================
// 热力图组件
// ============================================================

export function HeatmapChart({
  data,
  title = "访问热力图",
}: {
  data: HeatmapData[];
  title?: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    let cancelled = false;

    const render = async () => {
      const echarts = await import("echarts");
      if (cancelled) return;

      const chart = echarts.init(chartRef.current);

      // 处理数据：x 轴为小时，y 轴为星期
      const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

      const maxValue = Math.max(...data.map((d) => d.value), 1);

      const option: any = {
        tooltip: {
          position: "top",
          backgroundColor: "rgba(0,0,0,0.75)",
          borderColor: "transparent",
          textStyle: { color: "#fff", fontSize: 13 },
          formatter: (params: any) => {
            const [hour, day] = params.data;
            return `<div style="font-weight:600">${days[day]} ${hours[hour]}</div><div>访问量: ${params.data[2]}</div>`;
          },
        },
        grid: {
          top: "10%",
          bottom: "15%",
          left: "10%",
          right: "10%",
        },
        xAxis: {
          type: "category",
          data: hours,
          splitArea: { show: true },
          axisLabel: {
            fontSize: 10,
            interval: 2,
          },
        },
        yAxis: {
          type: "category",
          data: days,
          splitArea: { show: true },
          axisLabel: { fontSize: 11 },
        },
        visualMap: {
          min: 0,
          max: maxValue,
          calculable: true,
          orient: "horizontal",
          left: "center",
          bottom: "0%",
          inRange: {
            color: ["#f5f5f5", "#ffd591", "#ffa940", "#fa8c16", "#d46b08"],
          },
          textStyle: { fontSize: 11 },
        },
        series: [
          {
            name: "访问量",
            type: "heatmap",
            data: data.map((d) => [d.hour, d.day, d.value]),
            label: {
              show: data.length <= 168, // 只在数据量小时显示标签
              fontSize: 10,
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: "rgba(0, 0, 0, 0.5)",
              },
            },
          },
        ],
      };

      chart.setOption(option);

      const handleResize = () => chart.resize();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.dispose();
      };
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [data]);

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
      <h2 className="mb-4 text-sm font-medium">{title}</h2>
      <div ref={chartRef} className="h-[300px] w-full" />
    </div>
  );
}

// ============================================================
// 漏斗图组件
// ============================================================

export function FunnelChart({
  data,
  title = "访问漏斗",
}: {
  data: FunnelData[];
  title?: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    let cancelled = false;

    const render = async () => {
      const echarts = await import("echarts");
      if (cancelled) return;

      const chart = echarts.init(chartRef.current);

      const option: any = {
        tooltip: {
          trigger: "item",
          backgroundColor: "rgba(0,0,0,0.75)",
          borderColor: "transparent",
          textStyle: { color: "#fff", fontSize: 13 },
          formatter: (params: any) => {
            return `<div style="font-weight:600">${params.name}</div><div>数量: ${params.value}</div><div>占比: ${params.percent}%</div>`;
          },
        },
        series: [
          {
            name: "漏斗",
            type: "funnel",
            left: "10%",
            top: "10%",
            bottom: "10%",
            width: "80%",
            min: 0,
            max: Math.max(...data.map((d) => d.value)),
            minSize: "0%",
            maxSize: "100%",
            sort: "descending",
            gap: 2,
            label: {
              show: true,
              position: "inside",
              fontSize: 12,
              formatter: "{b}: {c}",
            },
            labelLine: {
              length: 10,
              lineStyle: {
                width: 1,
                type: "solid",
              },
            },
            itemStyle: {
              borderColor: "#fff",
              borderWidth: 1,
            },
            emphasis: {
              label: {
                fontSize: 14,
              },
            },
            data: data.map((d, index) => ({
              name: d.name,
              value: d.value,
              itemStyle: {
                color: [
                  "#f59e0b",
                  "#3b82f6",
                  "#10b981",
                  "#8b5cf6",
                  "#ef4444",
                ][index % 5],
              },
            })),
          },
        ],
      };

      chart.setOption(option);

      const handleResize = () => chart.resize();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.dispose();
      };
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [data]);

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
      <h2 className="mb-4 text-sm font-medium">{title}</h2>
      <div ref={chartRef} className="h-[300px] w-full" />
    </div>
  );
}

// ============================================================
// 桑基图组件
// ============================================================

export function SankeyChart({
  data,
  title = "访客流向",
}: {
  data: SankeeData;
  title?: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.nodes.length === 0) return;

    let cancelled = false;

    const render = async () => {
      const echarts = await import("echarts");
      if (cancelled) return;

      const chart = echarts.init(chartRef.current);

      const option: any = {
        tooltip: {
          trigger: "item",
          backgroundColor: "rgba(0,0,0,0.75)",
          borderColor: "transparent",
          textStyle: { color: "#fff", fontSize: 13 },
          formatter: (params: any) => {
            if (params.dataType === "edge") {
              return `<div style="font-weight:600">${params.data.source} → ${params.data.target}</div><div>流量: ${params.data.value}</div>`;
            }
            return `<div style="font-weight:600">${params.name}</div><div>流量: ${params.value}</div>`;
          },
        },
        series: [
          {
            type: "sankey",
            layout: "none",
            emphasis: {
              focus: "adjacency",
            },
            nodeAlign: "left",
            layoutIterations: 32,
            orient: "horizontal",
            nodeWidth: 20,
            nodeGap: 12,
            label: {
              show: true,
              position: "right",
              fontSize: 11,
            },
            lineStyle: {
              color: "gradient",
              curveness: 0.5,
            },
            itemStyle: {
              borderWidth: 1,
              borderColor: "#fff",
            },
            data: data.nodes.map((node, index) => ({
              name: node.name,
              itemStyle: {
                color: [
                  "#f59e0b",
                  "#3b82f6",
                  "#10b981",
                  "#8b5cf6",
                  "#ef4444",
                  "#06b6d4",
                  "#f97316",
                  "#84cc16",
                ][index % 8],
              },
            })),
            links: data.links,
          },
        ],
      };

      chart.setOption(option);

      const handleResize = () => chart.resize();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        chart.dispose();
      };
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [data]);

  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
      <h2 className="mb-4 text-sm font-medium">{title}</h2>
      <div ref={chartRef} className="h-[400px] w-full" />
    </div>
  );
}
