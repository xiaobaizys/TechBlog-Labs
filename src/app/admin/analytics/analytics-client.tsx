"use client";

import Link from "next/link";
import { useMemo } from "react";

type StatsData = {
  totalVisitors: number;
  totalPageViews: number;
  todayVisitors: number;
  todayPageViews: number;
  trend: { date: string; visitors: number; pageViews: number }[];
  topPages: { page: string; views: number }[];
};

const shortDate = (d: string) => d.slice(5);

type StatCardProps = {
  label: string;
  value: number;
  desc: string;
  accent: "blue" | "amber" | "emerald" | "violet";
};

const ACCENT_MAP: Record<StatCardProps["accent"], { bar: string; text: string; bg: string }> = {
  blue: { bar: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
  amber: { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  emerald: { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  violet: { bar: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30" },
};

function StatCard({ label, value, desc, accent }: StatCardProps) {
  const a = ACCENT_MAP[accent];
  return (
    <div className="relative overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <span className={`absolute left-0 top-0 h-full w-1 ${a.bar}`} aria-hidden />
      <div className="flex flex-col gap-2 pl-2">
        <span className="text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-foreground))]">
          {label}
        </span>
        <span className="font-serif text-5xl font-bold leading-none tracking-tight tabular-nums text-[rgb(var(--foreground))]">
          {value.toLocaleString()}
        </span>
        <span className={`text-xs font-medium ${a.text}`}>{desc}</span>
      </div>
    </div>
  );
}

type BarChartProps = {
  data: { date: string; visitors: number; pageViews: number }[];
};

function TrendBarChart({ data }: BarChartProps) {
  const max = useMemo(() => {
    let m = 1;
    for (const d of data) {
      m = Math.max(m, d.visitors, d.pageViews);
    }
    return m;
  }, [data]);

  const hasData = data.some((d) => d.visitors > 0 || d.pageViews > 0);

  if (!hasData) {
    return (
      <div className="rounded-lg border border-dashed border-[rgb(var(--border))] py-12 text-center text-sm text-[rgb(var(--muted-foreground))]">
        暂无访问数据
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2 sm:gap-3">
        {data.map((d) => {
          const vH = max === 0 ? 0 : (d.visitors / max) * 140;
          const pH = max === 0 ? 0 : (d.pageViews / max) * 140;
          return (
            <div key={d.date} className="group flex flex-1 flex-col items-center gap-1.5">
              <div className="flex flex-col items-center text-[10px] tabular-nums leading-tight">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {d.visitors}
                </span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {d.pageViews}
                </span>
              </div>
              <div className="flex h-40 items-end gap-1">
                <div
                  className="w-3 rounded-t-sm bg-blue-500 transition-all group-hover:bg-blue-600 sm:w-4 dark:bg-blue-500 dark:group-hover:bg-blue-400"
                  style={{ height: `${Math.max(vH, d.visitors > 0 ? 6 : 0)}px` }}
                  title={`访客 ${d.visitors}`}
                />
                <div
                  className="w-3 rounded-t-sm bg-amber-500 transition-all group-hover:bg-amber-600 sm:w-4 dark:bg-amber-500 dark:group-hover:bg-amber-400"
                  style={{ height: `${Math.max(pH, d.pageViews > 0 ? 6 : 0)}px` }}
                  title={`浏览 ${d.pageViews}`}
                />
              </div>
              <span className="font-mono text-[10px] font-medium tabular-nums text-[rgb(var(--foreground))] sm:text-[11px]">
                {shortDate(d.date)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-6 border-t border-[rgb(var(--border))] pt-3 text-xs">
        <span className="flex items-center gap-2 font-medium text-[rgb(var(--foreground))]">
          <span className="inline-block h-3 w-3 rounded-sm bg-blue-500" />
          访客
        </span>
        <span className="flex items-center gap-2 font-medium text-[rgb(var(--foreground))]">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
          浏览量
        </span>
      </div>
    </div>
  );
}

export function AnalyticsClient({ data }: { data: StatsData }) {
  return (
    <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 space-y-2">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">
          ✦ Visitor Analytics
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[rgb(var(--foreground))] sm:text-4xl">
          访客统计
        </h1>
        <p className="text-sm leading-relaxed text-[rgb(var(--muted-foreground))]">
          每一道来过这里的痕迹，都被悄悄记住。
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4 sm:gap-5">
        <StatCard label="今日访客" value={data.todayVisitors} desc="今天独立访客" accent="emerald" />
        <StatCard label="今日浏览量" value={data.todayPageViews} desc="今天总浏览" accent="blue" />
        <StatCard label="总访客数" value={data.totalVisitors} desc="累计独立访客" accent="violet" />
        <StatCard label="总浏览量" value={data.totalPageViews} desc="累计页面浏览" accent="amber" />
      </section>

      <section className="mb-8 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[rgb(var(--foreground))]">
              近 7 日访问趋势
            </h2>
            <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
              蓝柱 = 访客，橙柱 = 浏览量
            </p>
          </div>
        </div>
        <TrendBarChart data={data.trend} />
      </section>

      <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
        <div className="border-b border-[rgb(var(--border))] px-5 py-4 sm:px-6">
          <h2 className="font-serif text-lg font-semibold text-[rgb(var(--foreground))]">
            页面访问排行
          </h2>
          <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
            累计浏览最多的路径 Top 10
          </p>
        </div>

        {data.topPages.length === 0 ? (
          <div className="py-12 text-center text-sm text-[rgb(var(--muted-foreground))]">
            暂无访问数据
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[rgb(var(--muted))]/60 text-left">
                <tr>
                  <th className="w-14 px-5 py-3 font-semibold text-[rgb(var(--muted-foreground))] sm:px-6">
                    排名
                  </th>
                  <th className="px-3 py-3 font-semibold text-[rgb(var(--muted-foreground))]">
                    路径
                  </th>
                  <th className="px-5 py-3 text-right font-semibold text-[rgb(var(--muted-foreground))] sm:px-6">
                    浏览次数
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {data.topPages.map((item, i) => {
                  const rankColor =
                    i === 0
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                      : i === 1
                      ? "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300"
                      : i === 2
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                      : "bg-[rgb(var(--muted))] text-[rgb(var(--muted-foreground))]";
                  return (
                    <tr key={item.page} className="transition-colors hover:bg-[rgb(var(--muted))]/40">
                      <td className="px-5 py-3 sm:px-6">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums ${rankColor}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={item.page}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs font-medium text-[rgb(var(--foreground))] transition-colors hover:text-amber-600 dark:hover:text-amber-400"
                        >
                          {item.page}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sm font-semibold tabular-nums text-[rgb(var(--foreground))] sm:px-6">
                        {item.views.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </article>
  );
}
