"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  MapPin,
  Users,
  Building2,
  Loader2,
  Download,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

// ============================================================
// 类型
// ============================================================

interface ProvinceStat {
  province: string;
  count: number;
}

interface CityStat {
  province: string;
  city: string;
  count: number;
}

interface MapData {
  provinces: ProvinceStat[];
  cities: CityStat[];
  summary: {
    totalVisitors: number;
    provinceCount: number;
    cityCount: number;
  };
}

interface ProvinceDetail {
  province: string;
  cities: { city: string; count: number }[];
  summary: {
    totalVisitors: number;
    cityCount: number;
  };
}

// ============================================================
// Props
// ============================================================

interface VisitorMapProps {
  /** 隐藏顶部标题栏（用于嵌入 Tab 容器时） */
  hideHeader?: boolean;
  /** 显示导出 CSV 按钮（后台专用） */
  showExport?: boolean;
  /** 显示返回链接（后台专用） */
  showBackLink?: boolean;
  /** 返回链接地址 */
  backHref?: string;
  /** 返回链接文字 */
  backLabel?: string;
  /** 页面标题 */
  title?: string;
}

// ============================================================
// 中国省份名称映射（ECharts GeoJSON 名称 → 简称）
// ============================================================

const PROVINCE_NAME_MAP: Record<string, string> = {
  "北京市": "北京",
  "天津市": "天津",
  "上海市": "上海",
  "重庆市": "重庆",
  "河北省": "河北",
  "山西省": "山西",
  "辽宁省": "辽宁",
  "吉林省": "吉林",
  "黑龙江省": "黑龙江",
  "江苏省": "江苏",
  "浙江省": "浙江",
  "安徽省": "安徽",
  "福建省": "福建",
  "江西省": "江西",
  "山东省": "山东",
  "河南省": "河南",
  "湖北省": "湖北",
  "湖南省": "湖南",
  "广东省": "广东",
  "海南省": "海南",
  "四川省": "四川",
  "贵州省": "贵州",
  "云南省": "云南",
  "陕西省": "陕西",
  "甘肃省": "甘肃",
  "青海省": "青海",
  "台湾省": "台湾",
  "内蒙古自治区": "内蒙古",
  "广西壮族自治区": "广西",
  "西藏自治区": "西藏",
  "宁夏回族自治区": "宁夏",
  "新疆维吾尔自治区": "新疆",
  "香港特别行政区": "香港",
  "澳门特别行政区": "澳门",
};

// 反向映射：简称 → 全称
const REVERSE_NAME_MAP = Object.fromEntries(
  Object.entries(PROVINCE_NAME_MAP).map(([k, v]) => [v, k])
);

// ============================================================
// 组件
// ============================================================

export function VisitorMap({
  hideHeader = false,
  showExport = false,
  showBackLink = false,
  backHref = "/admin",
  backLabel = "返回统计",
  title = "访客地图",
}: VisitorMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(0); // 0 = 全部

  // 省份下钻状态
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [provinceDetail, setProvinceDetail] = useState<ProvinceDetail | null>(null);
  const [provinceLoading, setProvinceLoading] = useState(false);

  // 实时更新
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 加载数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/admin/stats/map${days > 0 ? `?days=${days}` : ""}`;
      const res = await fetch(url);
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

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        fetchData();
      }, 30000); // 每 30 秒刷新
    }
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, fetchData]);

  // 加载省份详情
  const fetchProvinceDetail = useCallback(async (province: string) => {
    try {
      setProvinceLoading(true);
      const url = `/api/admin/stats/map/${encodeURIComponent(province)}${days > 0 ? `?days=${days}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("获取省份数据失败");
      const json = await res.json();
      setProvinceDetail(json);
      setSelectedProvince(province);
    } catch (e: any) {
      console.error("加载省份详情失败:", e);
    } finally {
      setProvinceLoading(false);
    }
  }, [days]);

  // 返回全国视图
  const backToNational = useCallback(() => {
    setSelectedProvince(null);
    setProvinceDetail(null);
  }, []);

  // 初始化 ECharts
  useEffect(() => {
    if (!data || !mapRef.current) return;

    let cancelled = false;

    const init = async () => {
      const echarts = await import("echarts");
      if (cancelled) return;

      // 加载地图 GeoJSON（优先本地，降级远程）
      let geoJson: any;
      let mapName: string;

      if (selectedProvince) {
        // 加载省份地图
        const provinceCode = getProvinceCode(selectedProvince);
        if (!provinceCode) return;

        try {
          const response = await fetch(`/geo/provinces/${provinceCode}.json`);
          geoJson = await response.json();
        } catch {
          const response = await fetch(
            `https://geo.datav.aliyun.com/areas_v3/bound/${provinceCode}_full.json`
          );
          geoJson = await response.json();
        }
        mapName = "province";
      } else {
        // 加载中国地图（本地优先）
        try {
          const response = await fetch("/geo/china.json");
          geoJson = await response.json();
        } catch {
          const response = await fetch(
            "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json"
          );
          geoJson = await response.json();
        }
        mapName = "china";
      }

      if (cancelled) return;

      echarts.registerMap(mapName, geoJson as any);

      // 销毁旧实例
      if (chartRef.current) {
        chartRef.current.dispose();
      }

      const chart = echarts.init(mapRef.current);
      chartRef.current = chart;

      // 构建数据
      let mapData: { name: string; value: number }[] = [];
      let maxValue = 1;

      if (selectedProvince && provinceDetail) {
        // 省份下钻数据
        mapData = provinceDetail.cities.map((item) => ({
          name: item.city,
          value: item.count,
        }));
        maxValue = Math.max(...mapData.map((d) => d.value), 1);
      } else {
        // 全国数据
        mapData = data.provinces.map((item) => {
          const fullName = REVERSE_NAME_MAP[item.province] || item.province;
          return { name: fullName, value: item.count };
        });
        maxValue = Math.max(...mapData.map((d) => d.value), 1);
      }

      const option: any = {
        tooltip: {
          trigger: "item",
          formatter: (params: any) => {
            const value = params.value || 0;
            return `<div style="font-weight:600">${params.name}</div><div>访客数: ${value.toLocaleString()}</div>`;
          },
          backgroundColor: "rgba(0,0,0,0.75)",
          borderColor: "transparent",
          textStyle: { color: "#fff", fontSize: 13 },
        },
        visualMap: {
          min: 0,
          max: maxValue,
          left: "left",
          bottom: 20,
          text: ["多", "少"],
          textStyle: { color: "#999", fontSize: 12 },
          inRange: {
            color: ["#f5f5f5", "#ffd591", "#ffa940", "#fa8c16", "#d46b08"],
          },
          calculable: true,
          show: true,
        },
        series: [
          {
            name: "访客数",
            type: "map",
            map: mapName,
            roam: true,
            scaleLimit: { min: 0.8, max: 5 },
            zoom: 1.2,
            label: {
              show: true,
              fontSize: 10,
              color: "#666",
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 14,
                fontWeight: "bold",
                color: "#333",
              },
              itemStyle: {
                areaColor: "#ffd666",
                borderColor: "#fa8c16",
                borderWidth: 2,
              },
            },
            itemStyle: {
              borderColor: "#ddd",
              borderWidth: 0.5,
            },
            data: mapData,
          },
        ],
      };

      chart.setOption(option);

      // 点击事件（省份下钻）
      if (!selectedProvince) {
        chart.on("click", (params: any) => {
          const provinceName = PROVINCE_NAME_MAP[params.name];
          if (provinceName) {
            fetchProvinceDetail(provinceName);
          }
        });
      }

      // 响应式
      const handleResize = () => chart.resize();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [data, selectedProvince, provinceDetail, fetchProvinceDetail]);

  // 组件卸载时销毁
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.dispose();
      }
    };
  }, []);

  // 从 API 导出 CSV
  const exportFromApi = useCallback(async (type: "provinces" | "cities" | "raw") => {
    try {
      const url = `/api/admin/stats/map/export?type=${type}${days > 0 ? `&days=${days}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("导出失败");

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      // 从 Content-Disposition 获取文件名
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      link.download = filenameMatch?.[1] || `访客数据_${new Date().toISOString().slice(0, 10)}.csv`;

      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (e: any) {
      console.error("导出失败:", e);
    }
  }, [days]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 顶部 */}
      {!hideHeader && (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {showBackLink && (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-sm text-[rgb(var(--muted-foreground))] hover:text-amber-bright transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Link>
            )}
            <h1 className="font-serif text-2xl font-bold">{title}</h1>

            {/* 面包屑 */}
            {selectedProvince && (
              <div className="flex items-center gap-1 text-sm text-[rgb(var(--muted-foreground))]">
                <ChevronRight className="h-4 w-4" />
                <button
                  onClick={backToNational}
                  className="hover:text-amber-bright transition-colors"
                >
                  全国
                </button>
                <ChevronRight className="h-4 w-4" />
                <span className="text-[rgb(var(--foreground))]">
                  {selectedProvince}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 自动刷新 */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                autoRefresh
                  ? "bg-emerald-500 text-white"
                  : "border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))]"
              }`}
              title={autoRefresh ? "关闭自动刷新" : "开启自动刷新（30秒）"}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
            </button>

            {/* 手动刷新 */}
            <button
              onClick={fetchData}
              className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-1.5 text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright transition-colors"
              title="刷新数据"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            {/* 导出下拉菜单（仅后台显示） */}
            {showExport && (
              <div className="relative group">
                <button
                  disabled={!data || data.provinces.length === 0}
                  className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-1.5 text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="导出 CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <div className="absolute right-0 top-full z-10 mt-1 hidden w-40 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] py-1 shadow-lg group-hover:block">
                  <button
                    onClick={() => exportFromApi("provinces")}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-amber/10 hover:text-amber-bright"
                  >
                    导出省份汇总
                  </button>
                  <button
                    onClick={() => exportFromApi("cities")}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-amber/10 hover:text-amber-bright"
                  >
                    导出城市汇总
                  </button>
                  <button
                    onClick={() => exportFromApi("raw")}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-amber/10 hover:text-amber-bright"
                  >
                    导出原始数据
                  </button>
                </div>
              </div>
            )}

            {/* 时间筛选 */}
            {[
              { label: "全部", value: 0 },
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
      {(loading || provinceLoading) && (
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
      {data && !loading && !provinceLoading && (
        <>
          {/* 统计卡片 */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="总访客数"
              value={
                selectedProvince && provinceDetail
                  ? provinceDetail.summary.totalVisitors
                  : data.summary.totalVisitors
              }
              color="amber"
            />
            <StatCard
              icon={<Globe className="h-5 w-5" />}
              label={selectedProvince ? "覆盖城市" : "覆盖省份"}
              value={
                selectedProvince && provinceDetail
                  ? provinceDetail.summary.cityCount
                  : data.summary.provinceCount
              }
              suffix="个"
              color="blue"
            />
            <StatCard
              icon={<Building2 className="h-5 w-5" />}
              label={selectedProvince ? "省份访客" : "覆盖城市"}
              value={
                selectedProvince && provinceDetail
                  ? provinceDetail.summary.totalVisitors
                  : data.summary.cityCount
              }
              suffix={selectedProvince ? "" : "个"}
              color="green"
            />
          </div>

          {/* 无数据提示 */}
          {!selectedProvince && data.provinces.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card))] p-12 text-center">
              <MapPin className="mx-auto mb-4 h-12 w-12 text-[rgb(var(--muted-foreground))]/40" />
              <p className="text-lg font-medium text-[rgb(var(--muted-foreground))]">
                暂无访客数据
              </p>
              <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]/70">
                等待访客访问后，地图将自动展示分布情况
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* 地图区域 */}
              <div className="lg:col-span-2">
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-[rgb(var(--muted-foreground))]">
                      {selectedProvince
                        ? `${selectedProvince} - 城市分布`
                        : "中国访客分布"}
                    </h2>
                    {selectedProvince && (
                      <button
                        onClick={backToNational}
                        className="text-xs text-amber hover:text-amber-bright transition-colors"
                      >
                        ← 返回全国
                      </button>
                    )}
                  </div>
                  <div
                    ref={mapRef}
                    className="h-[400px] w-full sm:h-[500px]"
                  />
                  {!selectedProvince && (
                    <p className="mt-2 text-center text-xs text-[rgb(var(--muted-foreground))]/60">
                      点击省份可查看城市分布详情
                    </p>
                  )}
                </div>
              </div>

              {/* 排行列表 */}
              <div className="lg:col-span-1">
                {selectedProvince && provinceDetail ? (
                  /* 省份内城市排行 */
                  <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                    <h2 className="mb-4 text-sm font-medium text-[rgb(var(--muted-foreground))]">
                      {selectedProvince} - 城市排行
                    </h2>
                    {provinceDetail.cities.length === 0 ? (
                      <p className="py-8 text-center text-sm text-[rgb(var(--muted-foreground))]">
                        暂无城市数据
                      </p>
                    ) : (
                      <div className="max-h-[500px] space-y-2 overflow-y-auto">
                        {provinceDetail.cities.map((item, index) => (
                          <div
                            key={`${item.city}-${index}`}
                            className="flex items-center justify-between rounded-lg bg-[rgb(var(--background))] px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                                  index < 3
                                    ? "bg-amber/20 text-amber-bright"
                                    : "bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]"
                                }`}
                              >
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium">
                                {item.city}
                              </span>
                            </div>
                            <span className="font-mono text-xs text-[rgb(var(--muted-foreground))]">
                              {item.count.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 全国省份排行 */
                  <>
                    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                      <h2 className="mb-4 text-sm font-medium text-[rgb(var(--muted-foreground))]">
                        省份排行
                      </h2>
                      <div className="max-h-[500px] space-y-2 overflow-y-auto">
                        {data.provinces.slice(0, 50).map((item, index) => (
                          <button
                            key={item.province}
                            onClick={() => fetchProvinceDetail(item.province)}
                            className="flex w-full items-center justify-between rounded-lg bg-[rgb(var(--background))] px-3 py-2 text-left hover:bg-amber/10 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                                  index < 3
                                    ? "bg-amber/20 text-amber-bright"
                                    : "bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]"
                                }`}
                              >
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium">
                                {item.province}
                              </span>
                            </div>
                            <span className="font-mono text-xs text-[rgb(var(--muted-foreground))]">
                              {item.count.toLocaleString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 城市排行 */}
                    {data.cities.length > 0 && (
                      <div className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                        <h2 className="mb-4 text-sm font-medium text-[rgb(var(--muted-foreground))]">
                          热门城市
                        </h2>
                        <div className="max-h-[300px] space-y-2 overflow-y-auto">
                          {data.cities.slice(0, 20).map((item, index) => (
                            <div
                              key={`${item.province}-${item.city}`}
                              className="flex items-center justify-between rounded-lg bg-[rgb(var(--background))] px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded bg-[rgb(var(--muted))] text-[10px] font-bold text-[rgb(var(--muted-foreground))]">
                                  {index + 1}
                                </span>
                                <span className="text-sm">
                                  {item.city}
                                  <span className="ml-1 text-[10px] text-[rgb(var(--muted-foreground))]">
                                    {item.province}
                                  </span>
                                </span>
                              </div>
                              <span className="font-mono text-xs text-[rgb(var(--muted-foreground))]">
                                {item.count.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// 统计卡片
// ============================================================

function StatCard({
  icon,
  label,
  value,
  suffix = "",
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  color: "amber" | "blue" | "green";
}) {
  const colorMap = {
    amber: "bg-amber/10 text-amber-bright border-amber/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 text-sm opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-serif text-3xl font-bold">
        {value.toLocaleString()}
        {suffix && (
          <span className="ml-1 text-base font-normal opacity-70">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 辅助函数：省份名称 → GeoJSON 行政区划代码
// ============================================================

function getProvinceCode(province: string): string | null {
  const codeMap: Record<string, string> = {
    "北京": "110000",
    "天津": "120000",
    "河北": "130000",
    "山西": "140000",
    "内蒙古": "150000",
    "辽宁": "210000",
    "吉林": "220000",
    "黑龙江": "230000",
    "上海": "310000",
    "江苏": "320000",
    "浙江": "330000",
    "安徽": "340000",
    "福建": "350000",
    "江西": "360000",
    "山东": "370000",
    "河南": "410000",
    "湖北": "420000",
    "湖南": "430000",
    "广东": "440000",
    "广西": "450000",
    "海南": "460000",
    "重庆": "500000",
    "四川": "510000",
    "贵州": "520000",
    "云南": "530000",
    "西藏": "540000",
    "陕西": "610000",
    "甘肃": "620000",
    "青海": "630000",
    "宁夏": "640000",
    "新疆": "650000",
    "台湾": "710000",
    "香港": "810000",
    "澳门": "820000",
  };
  return codeMap[province] || null;
}
