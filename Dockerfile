# ============================================================
# TechBlog Labs — 生产环境 Dockerfile
# ============================================================
# 基于 Next.js standalone 输出，最小化镜像体积
# 构建: docker build -t techblog-labs .
# 运行: docker run -p 3000:3000 --env-file .env.production techblog-labs
# ============================================================

# ---- 依赖安装阶段 ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# ---- 构建阶段 ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# Next.js 构建（standalone 模式）
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 运行阶段 ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 仅复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# standalone 输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
