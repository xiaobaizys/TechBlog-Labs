/**
 * 自动扩缩容系统
 *
 * 基于系统负载自动调整实例数量。
 * 支持：
 * - PM2 集群模式
 * - Docker Swarm
 * - Kubernetes (HPA)
 *
 * 注意：此模块提供配置和脚本生成，实际扩缩容由外部编排工具执行。
 */

import os from "os";

// ============================================================
// 类型定义
// ============================================================

export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  cpuThreshold: number;      // CPU 使用率阈值（0-100）
  memoryThreshold: number;   // 内存使用率阈值（0-100）
  requestsThreshold: number; // 每分钟请求数阈值
  cooldownPeriod: number;    // 冷却期（秒）
  scaleUpStep: number;       // 每次扩容实例数
  scaleDownStep: number;     // 每次缩容实例数
}

export interface ScalingDecision {
  action: "scale-up" | "scale-down" | "maintain";
  currentInstances: number;
  targetInstances: number;
  reason: string;
  metrics: {
    cpu: number;
    memory: number;
    requestsPerMinute: number;
  };
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: ScalingConfig = {
  minInstances: 1,
  maxInstances: 4,
  cpuThreshold: 70,
  memoryThreshold: 80,
  requestsThreshold: 1000,
  cooldownPeriod: 300,
  scaleUpStep: 1,
  scaleDownStep: 1,
};

// ============================================================
// 扩缩容决策
// ============================================================

/**
 * 分析负载并做出扩缩容决策
 */
export function analyzeAndDecide(
  metrics: {
    cpu: number;
    memory: number;
    requestsPerMinute: number;
  },
  currentInstances: number,
  config: Partial<ScalingConfig> = {}
): ScalingDecision {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // 检查是否需要扩容
  const shouldScaleUp =
    metrics.cpu > fullConfig.cpuThreshold ||
    metrics.memory > fullConfig.memoryThreshold ||
    metrics.requestsPerMinute > fullConfig.requestsThreshold;

  // 检查是否可以缩容
  const canScaleDown =
    metrics.cpu < fullConfig.cpuThreshold * 0.5 &&
    metrics.memory < fullConfig.memoryThreshold * 0.5 &&
    metrics.requestsPerMinute < fullConfig.requestsThreshold * 0.3;

  if (shouldScaleUp && currentInstances < fullConfig.maxInstances) {
    const targetInstances = Math.min(
      currentInstances + fullConfig.scaleUpStep,
      fullConfig.maxInstances
    );

    const reasons = [];
    if (metrics.cpu > fullConfig.cpuThreshold) {
      reasons.push(`CPU ${metrics.cpu.toFixed(1)}% > ${fullConfig.cpuThreshold}%`);
    }
    if (metrics.memory > fullConfig.memoryThreshold) {
      reasons.push(`内存 ${metrics.memory.toFixed(1)}% > ${fullConfig.memoryThreshold}%`);
    }
    if (metrics.requestsPerMinute > fullConfig.requestsThreshold) {
      reasons.push(`请求 ${metrics.requestsPerMinute}/min > ${fullConfig.requestsThreshold}/min`);
    }

    return {
      action: "scale-up",
      currentInstances,
      targetInstances,
      reason: `负载过高: ${reasons.join(", ")}`,
      metrics,
    };
  }

  if (canScaleDown && currentInstances > fullConfig.minInstances) {
    const targetInstances = Math.max(
      currentInstances - fullConfig.scaleDownStep,
      fullConfig.minInstances
    );

    return {
      action: "scale-down",
      currentInstances,
      targetInstances,
      reason: `负载较低，可以缩容`,
      metrics,
    };
  }

  return {
    action: "maintain",
    currentInstances,
    targetInstances: currentInstances,
    reason: "负载正常，保持当前实例数",
    metrics,
  };
}

// ============================================================
// 配置生成
// ============================================================

/**
 * 生成 PM2 配置文件
 */
export function generatePM2Config(config: Partial<ScalingConfig> = {}): string {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  return `module.exports = {
  apps: [{
    name: 'techblog-labs',
    script: 'server.ts',
    interpreter: 'tsx',
    instances: 'max', // 使用所有 CPU 核心
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    // 集群配置
    instance_var: 'INSTANCE_ID',
    // 日志
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // 优雅关闭
    kill_timeout: 5000,
    listen_timeout: 10000,
    // 监控
    pmx: true,
    // 扩缩容配置
    min_uptime: '10s',
    max_restarts: 10,
  }]
};
`;
}

/**
 * 生成 Docker Compose 配置
 */
export function generateDockerComposeConfig(config: Partial<ScalingConfig> = {}): string {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/blog
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    deploy:
      replicas: ${fullConfig.minInstances}
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=blog

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
`;
}

/**
 * 生成 Kubernetes HPA 配置
 */
export function generateKubernetesHPAConfig(config: Partial<ScalingConfig> = {}): string {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: techblog-labs-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: techblog-labs
  minReplicas: ${fullConfig.minInstances}
  maxReplicas: ${fullConfig.maxInstances}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: ${fullConfig.cpuThreshold}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: ${fullConfig.memoryThreshold}
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: ${fullConfig.scaleUpStep}
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: ${fullConfig.cooldownPeriod}
      policies:
        - type: Pods
          value: ${fullConfig.scaleDownStep}
          periodSeconds: 120
`;
}

/**
 * 生成 Nginx 负载均衡配置
 */
export function generateNginxConfig(instances: number = 2): string {
  const upstreamServers = Array.from(
    { length: instances },
    (_, i) => `    server 127.0.0.1:${3000 + i};`
  ).join("\n");

  return `upstream techblog_labs {
    least_conn;
${upstreamServers}
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://techblog_labs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket 支持
    location /api/socketio {
        proxy_pass http://techblog_labs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
`;
}

// ============================================================
// 监控集成
// ============================================================

/**
 * 获取当前系统负载
 */
export function getCurrentLoad(): {
  cpu: number;
  memory: number;
  uptime: number;
} {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();

  // CPU 使用率
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total) * 100;
  }, 0) / cpus.length;

  return {
    cpu: cpuUsage,
    memory: ((totalMemory - freeMemory) / totalMemory) * 100,
    uptime: os.uptime(),
  };
}
