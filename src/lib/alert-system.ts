/**
 * 访客告警系统
 *
 * 监控访问量异常，当超过阈值时触发告警。
 * 支持多种告警方式：控制台日志、邮件、Slack、企业微信。
 */

import { prisma } from "./prisma";
import { sendAlertNotification } from "./notification-service";

// ============================================================
// 类型定义
// ============================================================

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: "threshold" | "anomaly" | "spike";
  metric: "visitors" | "pageviews" | "errors";
  condition: "gt" | "lt" | "eq" | "spike_up" | "spike_down";
  threshold: number;
  timeWindow: number; // 分钟
  enabled: boolean;
  channels: AlertChannel[];
}

export interface AlertChannel {
  type: "console" | "email" | "webhook";
  config: Record<string, any>;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  message: string;
  acknowledged: boolean;
}

// ============================================================
// 默认告警规则
// ============================================================

const DEFAULT_RULES: AlertRule[] = [
  {
    id: "high-traffic",
    name: "访问量激增",
    description: "当访问量突然增加超过阈值时告警",
    type: "spike",
    metric: "visitors",
    condition: "spike_up",
    threshold: 200, // 增长 200%
    timeWindow: 30,
    enabled: true,
    channels: [{ type: "console", config: {} }],
  },
  {
    id: "low-traffic",
    name: "访问量骤降",
    description: "当访问量突然下降超过阈值时告警",
    type: "spike",
    metric: "visitors",
    condition: "spike_down",
    threshold: 80, // 下降 80%
    timeWindow: 30,
    enabled: true,
    channels: [{ type: "console", config: {} }],
  },
  {
    id: "high-pageviews",
    name: "页面浏览量过高",
    description: "当页面浏览量超过绝对阈值时告警",
    type: "threshold",
    metric: "pageviews",
    condition: "gt",
    threshold: 10000, // 10000 次/小时
    timeWindow: 60,
    enabled: true,
    channels: [{ type: "console", config: {} }],
  },
];

// ============================================================
// 告警状态管理
// ============================================================

// 内存中存储告警历史（生产环境建议使用 Redis）
const alertHistory: AlertEvent[] = [];
const lastAlertTime: Map<string, Date> = new Map();

// 告警冷却时间（防止重复告警）
const ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 分钟

/**
 * 获取当前访客统计数据
 */
async function getCurrentStats(timeWindow: number) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - timeWindow * 60 * 1000);

  const [visitors, pageviews] = await Promise.all([
    // 独立访客数
    prisma.visit.findMany({
      where: {
        createdAt: { gte: windowStart },
      },
      select: { visitorId: true },
      distinct: ["visitorId"],
    }),
    // 页面浏览量
    prisma.visit.count({
      where: {
        createdAt: { gte: windowStart },
      },
    }),
  ]);

  return {
    visitors: visitors.length,
    pageviews,
    timestamp: now,
  };
}

/**
 * 获取历史平均值（用于检测异常）
 */
async function getHistoricalAverage(metric: string, timeWindow: number) {
  const now = new Date();
  const days = 7; // 使用过去 7 天的数据

  const stats: number[] = [];

  for (let i = 1; i <= days; i++) {
    const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const windowStart = new Date(dayStart.getTime() - timeWindow * 60 * 1000);

    let value: number;

    if (metric === "visitors") {
      const visitors = await prisma.visit.findMany({
        where: {
          createdAt: {
            gte: windowStart,
            lt: dayStart,
          },
        },
        select: { visitorId: true },
        distinct: ["visitorId"],
      });
      value = visitors.length;
    } else {
      value = await prisma.visit.count({
        where: {
          createdAt: {
            gte: windowStart,
            lt: dayStart,
          },
        },
      });
    }

    stats.push(value);
  }

  // 计算平均值
  const avg = stats.reduce((a, b) => a + b, 0) / stats.length;
  return avg;
}

/**
 * 检查告警条件
 */
async function checkAlertRule(rule: AlertRule): Promise<AlertEvent | null> {
  const stats = await getCurrentStats(rule.timeWindow);
  const currentValue = rule.metric === "visitors" ? stats.visitors : stats.pageviews;

  let triggered = false;
  let message = "";

  switch (rule.condition) {
    case "gt":
      triggered = currentValue > rule.threshold;
      message = `${rule.metric} 超过阈值: ${currentValue} > ${rule.threshold}`;
      break;

    case "lt":
      triggered = currentValue < rule.threshold;
      message = `${rule.metric} 低于阈值: ${currentValue} < ${rule.threshold}`;
      break;

    case "eq":
      triggered = currentValue === rule.threshold;
      message = `${rule.metric} 等于阈值: ${currentValue} = ${rule.threshold}`;
      break;

    case "spike_up":
    case "spike_down": {
      const avg = await getHistoricalAverage(rule.metric, rule.timeWindow);
      if (avg > 0) {
        const changePercent = ((currentValue - avg) / avg) * 100;

        if (rule.condition === "spike_up") {
          triggered = changePercent > rule.threshold;
          message = `${rule.metric} 激增 ${changePercent.toFixed(1)}% (当前: ${currentValue}, 历史均值: ${avg.toFixed(0)})`;
        } else {
          triggered = changePercent < -rule.threshold;
          message = `${rule.metric} 骤降 ${Math.abs(changePercent).toFixed(1)}% (当前: ${currentValue}, 历史均值: ${avg.toFixed(0)})`;
        }
      }
      break;
    }
  }

  if (!triggered) return null;

  // 检查冷却时间
  const lastAlert = lastAlertTime.get(rule.id);
  if (lastAlert && Date.now() - lastAlert.getTime() < ALERT_COOLDOWN_MS) {
    return null;
  }

  // 创建告警事件
  const alertEvent: AlertEvent = {
    id: `alert-${Date.now()}-${rule.id}`,
    ruleId: rule.id,
    ruleName: rule.name,
    metric: rule.metric,
    currentValue,
    threshold: rule.threshold,
    timestamp: new Date(),
    message,
    acknowledged: false,
  };

  // 更新最后告警时间
  lastAlertTime.set(rule.id, new Date());

  return alertEvent;
}

/**
 * 发送告警通知
 */
async function sendAlert(alert: AlertEvent, channels: AlertChannel[]) {
  // 提取渠道类型
  const channelTypes = channels.map((c) => c.type as "email" | "slack" | "wecom" | "console");

  // 使用通知服务发送
  await sendAlertNotification(
    {
      ruleName: alert.ruleName,
      message: alert.message,
      metric: alert.metric,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
    },
    channelTypes
  );
}

/**
 * 运行告警检查
 */
export async function runAlertCheck(): Promise<AlertEvent[]> {
  const triggeredAlerts: AlertEvent[] = [];

  for (const rule of DEFAULT_RULES) {
    if (!rule.enabled) continue;

    try {
      const alert = await checkAlertRule(rule);
      if (alert) {
        triggeredAlerts.push(alert);
        alertHistory.push(alert);

        // 发送通知
        await sendAlert(alert, rule.channels);
      }
    } catch (error) {
      console.error(`[Alert] Error checking rule ${rule.id}:`, error);
    }
  }

  return triggeredAlerts;
}

/**
 * 获取告警历史
 */
export function getAlertHistory(limit: number = 50): AlertEvent[] {
  return alertHistory
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * 确认告警
 */
export function acknowledgeAlert(alertId: string): boolean {
  const alert = alertHistory.find((a) => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    return true;
  }
  return false;
}

/**
 * 获取所有告警规则
 */
export function getAlertRules(): AlertRule[] {
  return DEFAULT_RULES;
}

/**
 * 更新告警规则
 */
export function updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
  const rule = DEFAULT_RULES.find((r) => r.id === ruleId);
  if (rule) {
    Object.assign(rule, updates);
    return true;
  }
  return false;
}
