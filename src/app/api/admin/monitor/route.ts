import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { prisma } from "@/lib/prisma";
import { getCacheStats } from "@/lib/advanced-cache";
import { getAlertHistory } from "@/lib/alert-system";
import os from "os";

/**
 * GET /api/admin/monitor
 *
 * 返回系统监控数据：
 * - 系统信息（CPU、内存、运行时间）
 * - 数据库统计
 * - 缓存统计
 * - 最近告警
 * - 实时指标
 */

export async function GET() {
  try {
    await requireAdmin();

    // 并行获取所有监控数据
    const [
      systemInfo,
      dbStats,
      cacheStats,
      recentAlerts,
      realtimeMetrics,
    ] = await Promise.all([
      getSystemInfo(),
      getDatabaseStats(),
      getCacheStats(),
      getAlertHistory(10),
      getRealtimeMetrics(),
    ]);

    return NextResponse.json({
      system: systemInfo,
      database: dbStats,
      cache: cacheStats,
      alerts: recentAlerts,
      realtime: realtimeMetrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/admin/monitor]", error);
    return NextResponse.json(
      { error: "获取监控数据失败" },
      { status: 500 }
    );
  }
}

/**
 * 获取系统信息
 */
async function getSystemInfo() {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const uptime = os.uptime();

  // CPU 使用率计算
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total) * 100;
  }, 0) / cpus.length;

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cpu: {
      model: cpus[0]?.model || "Unknown",
      cores: cpus.length,
      usage: Math.round(cpuUsage * 100) / 100,
    },
    memory: {
      total: formatBytes(totalMemory),
      free: formatBytes(freeMemory),
      used: formatBytes(totalMemory - freeMemory),
      usagePercent: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
    },
    uptime: formatUptime(uptime),
    uptimeSeconds: uptime,
  };
}

/**
 * 获取数据库统计
 */
async function getDatabaseStats() {
  const [
    totalVisits,
    todayVisits,
    totalPosts,
    totalUsers,
    totalComments,
  ] = await Promise.all([
    prisma.visit.count(),
    prisma.visit.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.comment.count(),
  ]);

  return {
    totalVisits,
    todayVisits,
    totalPosts,
    totalUsers,
    totalComments,
  };
}

/**
 * 获取实时指标
 */
async function getRealtimeMetrics() {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [last5Minutes, lastHour] = await Promise.all([
    prisma.visit.count({
      where: { createdAt: { gte: fiveMinutesAgo } },
    }),
    prisma.visit.count({
      where: { createdAt: { gte: oneHourAgo } },
    }),
  ]);

  // 计算每分钟访问率
  const rpm = Math.round(last5Minutes / 5);
  const hourlyRpm = Math.round(lastHour / 60);

  return {
    last5Minutes,
    lastHour,
    requestsPerMinute: rpm,
    hourlyAverageRpm: hourlyRpm,
  };
}

/**
 * 格式化字节
 */
function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 格式化运行时间
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);

  return parts.join(" ") || "刚刚启动";
}
