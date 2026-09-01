/**
 * Socket.io 服务器配置
 *
 * 用于实时推送访客数据到管理后台。
 */

import { Server as SocketIOServer } from "socket.io";

// 单例模式：全局 Socket.io 实例
let io: SocketIOServer | null = null;

/**
 * 获取或创建 Socket.io 实例
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * 初始化 Socket.io 服务器
 * 需要在 API route 中调用
 */
export function initSocketServer(httpServer: any): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("[Socket.io] Client connected:", socket.id);

    // 加入管理员房间（用于接收实时数据）
    socket.on("join-admin", () => {
      socket.join("admin-room");
      console.log("[Socket.io] Admin joined:", socket.id);
    });

    // 离开管理员房间
    socket.on("leave-admin", () => {
      socket.leave("admin-room");
    });

    socket.on("disconnect", () => {
      console.log("[Socket.io] Client disconnected:", socket.id);
    });
  });

  return io;
}

/**
 * 向管理员房间广播新访客数据
 */
export function broadcastNewVisitor(visitorData: {
  province: string;
  city: string;
  page: string;
  timestamp: Date;
}) {
  if (!io) return;

  io.to("admin-room").emit("new-visitor", visitorData);
}

/**
 * 向管理员房间广播统计数据更新
 */
export function broadcastStatsUpdate(stats: {
  totalVisitors: number;
  provinceCount: number;
  cityCount: number;
}) {
  if (!io) return;

  io.to("admin-room").emit("stats-update", stats);
}
