"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * 轮询实时数据 Hook
 *
 * 作为 Socket.io 的降级方案，使用 HTTP 轮询获取实时数据。
 * 适用于不支持 WebSocket 的环境（如 Vercel Serverless）。
 */

interface PollingOptions {
  interval?: number; // 轮询间隔（毫秒）
  enabled?: boolean; // 是否启用
}

interface NewVisitor {
  province: string;
  city: string;
  page: string;
  timestamp: string;
}

interface StatsUpdate {
  totalVisitors: number;
  provinceCount: number;
  cityCount: number;
}

export function useRealtimePolling(options: PollingOptions = {}) {
  const { interval = 10000, enabled = true } = options; // 默认 10 秒
  const [connected, setConnected] = useState(false);
  const [newVisitors, setNewVisitors] = useState<NewVisitor[]>([]);
  const [statsUpdate, setStatsUpdate] = useState<StatsUpdate | null>(null);
  const lastTimestampRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/socketio?since=${lastTimestampRef.current}`
      );
      if (!res.ok) return;

      const data = await res.json();
      lastTimestampRef.current = data.timestamp;

      if (data.messages.length > 0) {
        // 处理新访客消息
        const visitorMessages = data.messages
          .filter((m: any) => m.event === "new-visitor")
          .map((m: any) => m.data);

        if (visitorMessages.length > 0) {
          setNewVisitors((prev) => [...visitorMessages, ...prev].slice(0, 50));
        }

        // 处理统计更新消息
        const statsMessages = data.messages.filter(
          (m: any) => m.event === "stats-update"
        );
        if (statsMessages.length > 0) {
          setStatsUpdate(statsMessages[statsMessages.length - 1].data);
        }
      }

      setConnected(true);
    } catch (error) {
      console.error("[Polling] Error fetching updates:", error);
      setConnected(false);
    }
  }, []);

  // 启动轮询
  useEffect(() => {
    if (!enabled) return;

    // 立即获取一次
    fetchUpdates();

    // 设置定时器
    timerRef.current = setInterval(fetchUpdates, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, interval, fetchUpdates]);

  // 清除新访客列表
  const clearNewVisitors = useCallback(() => {
    setNewVisitors([]);
  }, []);

  return {
    connected,
    newVisitors,
    statsUpdate,
    clearNewVisitors,
  };
}
