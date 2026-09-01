/**
 * 自定义 Node.js 服务器
 *
 * 支持 WebSocket（Socket.io）与 Next.js 集成。
 * 使用 Redis Adapter 支持多实例部署。
 *
 * 使用方法：
 * - 开发：npm run dev（使用 Next.js 内置服务器）
 * - 生产：npm run build && npm run start:custom
 * - 集群：启动多个实例，共享同一个 Redis
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { jwtVerify } from "jose";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

// 初始化 Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Socket.io 实例
let io: SocketIOServer | null = null;

/**
 * 获取 Socket.io 实例
 */
export function getSocketIO(): SocketIOServer | null {
  return io;
}

/**
 * 验证 JWT token
 */
async function verifyToken(token: string): Promise<{ id: string; role: string } | null> {
  try {
    if (!authSecret) {
      console.warn("[Socket.io] AUTH_SECRET 未配置，跳过验证");
      return null;
    }

    const secret = new TextEncoder().encode(authSecret);
    const { payload } = await jwtVerify(token, secret);

    return {
      id: payload.id as string,
      role: payload.role as string,
    };
  } catch (error) {
    console.warn("[Socket.io] Token 验证失败:", error);
    return null;
  }
}

/**
 * 初始化 Redis 客户端（用于 Socket.io Adapter）
 */
async function createRedisClients() {
  const pubClient = new Redis(redisUrl);
  const subClient = new Redis(redisUrl);

  await Promise.all([
    new Promise((resolve) => pubClient.on("ready", resolve)),
    new Promise((resolve) => subClient.on("ready", resolve)),
  ]);

  return { pubClient, subClient };
}

app.prepare().then(async () => {
  // 创建 HTTP 服务器
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // 初始化 Socket.io
  io = new SocketIOServer(server, {
    path: "/api/socketio",
    cors: {
      origin: dev ? "*" : process.env.NEXT_PUBLIC_SITE_URL || "*",
      methods: ["GET", "POST"],
    },
    // 生产环境配置
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  // 尝试连接 Redis Adapter（支持多实例）
  try {
    const { pubClient, subClient } = await createRedisClients();
    io.adapter(createAdapter(pubClient, subClient));
    console.log("> Redis Adapter connected (multi-instance mode)");
  } catch (error) {
    console.warn("> Redis Adapter not available, running in single-instance mode");
    console.warn("> To enable multi-instance, ensure Redis is running");
  }

  // Socket.io 事件处理
  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // 存储用户信息
    let userInfo: { id: string; role: string } | null = null;

    // 验证 token（连接时）
    socket.on("authenticate", async (token: string, callback) => {
      const user = await verifyToken(token);
      if (user) {
        userInfo = user;
        console.log(`[Socket.io] 用户已认证: ${socket.id}, 角色: ${user.role}`);
        if (typeof callback === "function") {
          callback({ success: true, role: user.role });
        }
      } else {
        if (typeof callback === "function") {
          callback({ success: false, message: "认证失败" });
        }
      }
    });

    // 加入管理员房间（需要验证管理员角色）
    socket.on("join-admin", async (token: string, callback) => {
      // 如果已经认证过，直接检查角色
      if (!userInfo) {
        // 尝试从 token 验证
        const user = await verifyToken(token);
        if (!user) {
          if (typeof callback === "function") {
            callback({ success: false, message: "认证失败" });
          }
          return;
        }
        userInfo = user;
      }

      // 检查是否是管理员
      if (userInfo.role !== "ADMIN") {
        if (typeof callback === "function") {
          callback({ success: false, message: "权限不足" });
        }
        return;
      }

      socket.join("admin-room");
      console.log(`[Socket.io] Admin joined: ${socket.id}`);

      if (typeof callback === "function") {
        callback({ success: true });
      }
    });

    // 离开管理员房间
    socket.on("leave-admin", () => {
      socket.leave("admin-room");
    });

    // 心跳检测
    socket.on("ping", (callback) => {
      if (typeof callback === "function") {
        callback();
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // 错误处理
    socket.on("error", (error) => {
      console.error(`[Socket.io] Socket error: ${socket.id}`, error);
    });
  });

  // 向管理员房间广播新访客数据
  const broadcastNewVisitor = (visitorData: {
    province: string;
    city: string;
    page: string;
    timestamp: Date;
  }) => {
    if (!io) return;
    io.to("admin-room").emit("new-visitor", visitorData);
  };

  // 向管理员房间广播统计数据更新
  const broadcastStatsUpdate = (stats: {
    totalVisitors: number;
    provinceCount: number;
    cityCount: number;
  }) => {
    if (!io) return;
    io.to("admin-room").emit("stats-update", stats);
  };

  // 导出广播函数供 API 使用
  (globalThis as any).__socketBroadcast = {
    newVisitor: broadcastNewVisitor,
    statsUpdate: broadcastStatsUpdate,
  };

  // 启动服务器
  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${dev ? "development" : "production"}`);
    console.log(`> WebSocket: enabled`);
    console.log(`> Redis: ${redisUrl.replace(/:[^:@]+@/, ":***@")}`);
  });

  // 优雅关闭
  const gracefulShutdown = async () => {
    console.log("\n> Shutting down gracefully...");

    // 关闭 Socket.io
    if (io) {
      io.close(() => {
        console.log("> Socket.io closed");
      });
    }

    // 关闭 HTTP 服务器
    server.close(() => {
      console.log("> HTTP server closed");
      process.exit(0);
    });

    // 超时强制关闭
    setTimeout(() => {
      console.error("> Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
});
