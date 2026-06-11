"use client";

import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ============================================================
// 类型
// ============================================================

type DashboardData = {
  totalPosts: number;
  totalComments: number;
  totalUsers: number;
  totalViews: number;
  weeklyPosts: { date: string; count: number }[];
  weeklyComments: { date: string; count: number }[];
  topPosts: { id: string; title: string; slug: string; viewCount: number; likeCount: number }[];
};

// ============================================================
// 统计卡片
// ============================================================

const STAT_CARDS = (data: DashboardData) => [
  {
    label: "总文章数",
    value: data.totalPosts,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
    color: "from-blue-500 to-blue-600",
  },
  {
    label: "总评论数",
    value: data.totalComments,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    color: "from-green-500 to-green-600",
  },
  {
    label: "总用户数",
    value: data.totalUsers,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    color: "from-purple-500 to-purple-600",
  },
  {
    label: "总阅读量",
    value: data.totalViews,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    color: "from-amber-500 to-amber-600",
  },
];

// ============================================================
// 图表自定义 tooltip
// ============================================================

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-xs shadow-lg">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ============================================================
// 组件
// ============================================================

export function DashboardClient({ data }: { data: DashboardData }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">数据看板</h1>

      {/* ============================================================ */}
      {/* 统计卡片 */}
      {/* ============================================================ */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS(data).map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[rgb(var(--muted-foreground))]">
                {card.label}
              </span>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${card.color} text-white`}
              >
                {card.icon}
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* 图表 */}
      {/* ============================================================ */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* 近7天文章发布趋势 */}
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
          <h3 className="mb-4 text-sm font-semibold">近7天文章发布趋势</h3>
          {data.weeklyPosts.every((d) => d.count === 0) ? (
            <div className="flex h-60 items-center justify-center text-sm text-[rgb(var(--muted-foreground))]">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.weeklyPosts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d: string) => d.slice(5)}
                  stroke="rgb(var(--muted-foreground))"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  stroke="rgb(var(--muted-foreground))"
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="文章" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 近7天评论量 */}
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
          <h3 className="mb-4 text-sm font-semibold">近7天评论量</h3>
          {data.weeklyComments.every((d) => d.count === 0) ? (
            <div className="flex h-60 items-center justify-center text-sm text-[rgb(var(--muted-foreground))]">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.weeklyComments}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d: string) => d.slice(5)}
                  stroke="rgb(var(--muted-foreground))"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  stroke="rgb(var(--muted-foreground))"
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="评论" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 热门文章排行榜 */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
        <div className="border-b border-[rgb(var(--border))] px-5 py-4">
          <h3 className="text-sm font-semibold">热门文章 TOP 5</h3>
        </div>
        {data.topPosts.length === 0 ? (
          <div className="p-8 text-center text-sm text-[rgb(var(--muted-foreground))]">
            暂无文章
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--muted))] text-left">
              <tr>
                <th className="px-5 py-3 w-12 font-medium">#</th>
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-4 py-3 font-medium text-right">阅读量</th>
                <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">
                  点赞
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {data.topPosts.map((post, i) => (
                <tr
                  key={post.id}
                  className="transition-colors hover:bg-[rgb(var(--muted))]/50"
                >
                  <td className="px-5 py-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0
                          ? "bg-amber-100 text-amber-700"
                          : i === 1
                          ? "bg-slate-200 text-slate-600"
                          : i === 2
                          ? "bg-orange-100 text-orange-700"
                          : "text-[rgb(var(--muted-foreground))]"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      className="font-medium hover:text-primary-600 transition-colors"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {post.viewCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                    {post.likeCount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
