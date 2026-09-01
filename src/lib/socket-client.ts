"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

/**
 * Socket.io 客户端 Hook
 *
 * 用于连接 Socket.io 服务器并接收实时数据。
 */

interface UseSocketOptions {
  autoConnect?: boolean;
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

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [newVisitor, setNewVisitor] = useState<NewVisitor | null>(null);
  const [statsUpdate, setStatsUpdate] = useState<StatsUpdate | null>(null);

  // 连接
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io({
      path: "/api/socketio",
      autoConnect: false,
    });

    socket.on("connect", () => {
      console.log("[Socket.io] Connected:", socket.id);
      setConnected(true);
      // 加入管理员房间
      socket.emit("join-admin");
    });

    socket.on("disconnect", () => {
      console.log("[Socket.io] Disconnected");
      setConnected(false);
    });

    // 接收新访客数据
    socket.on("new-visitor", (data: NewVisitor) => {
      setNewVisitor(data);
    });

    // 接收统计数据更新
    socket.on("stats-update", (data: StatsUpdate) => {
      setStatsUpdate(data);
    });

    socket.connect();
    socketRef.current = socket;
  }, []);

  // 断开连接
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("leave-admin");
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  // 自动连接
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connected,
    newVisitor,
    statsUpdate,
    connect,
    disconnect,
  };
}
