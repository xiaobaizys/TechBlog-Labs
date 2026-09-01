# TechBlog-Labs 数据库表修复指南

## 🚨 问题描述

从 PM2 日志中看到以下错误：

```
PrismaClientKnownRequestError:
Invalid `prisma.$queryRaw()` invocation:
Raw query failed. Code: `42P01`. Message: `relation "Visit" does not exist`
```

这表明 **Visit 表不存在**，需要手动创建。

---

## 🔧 修复方案

### 方案一：使用修复脚本（推荐）

#### 1. 上传修复脚本

```bash
# 在本地执行
scp fix-database.sh root@117.72.12.223:/root/techblog/
```

#### 2. 在服务器上执行

```bash
# SSH 连接到服务器
ssh root@117.72.12.223
cd /root/techblog

# 给脚本执行权限
chmod +x fix-database.sh

# 执行修复脚本
./fix-database.sh
```

---

### 方案二：手动执行 SQL（如果脚本失败）

#### 1. 连接到数据库

```bash
# SSH 连接到服务器
ssh root@117.72.12.223

# 连接到 PostgreSQL
psql -U root -d techblog_labs
```

#### 2. 创建 Visit 表

在 psql 中执行以下 SQL：

```sql
-- 创建 Visit 表
CREATE TABLE IF NOT EXISTS "Visit" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT,
    "page" TEXT NOT NULL,
    "referer" TEXT,
    "userAgent" TEXT,
    "ip" VARCHAR(45),
    "country" VARCHAR(50),
    "province" VARCHAR(50),
    "city" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "Visit_visitorId_idx" ON "Visit"("visitorId");
CREATE INDEX IF NOT EXISTS "Visit_createdAt_idx" ON "Visit"("createdAt");
CREATE INDEX IF NOT EXISTS "Visit_page_idx" ON "Visit"("page");
CREATE INDEX IF NOT EXISTS "Visit_visitorId_createdAt_idx" ON "Visit"("visitorId", "createdAt");
CREATE INDEX IF NOT EXISTS "Visit_province_idx" ON "Visit"("province");
CREATE INDEX IF NOT EXISTS "Visit_userAgent_createdAt_idx" ON "Visit"("userAgent", "createdAt");
CREATE INDEX IF NOT EXISTS "Visit_province_city_idx" ON "Visit"("province", "city");
CREATE INDEX IF NOT EXISTS "Visit_referer_idx" ON "Visit"("referer");
CREATE INDEX IF NOT EXISTS "Visit_city_idx" ON "Visit"("city");
```

#### 3. 创建 DailyStats 表

```sql
-- 创建 DailyStats 表
CREATE TABLE IF NOT EXISTS "DailyStats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyStats_pkey" PRIMARY KEY ("id")
);

-- 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS "DailyStats_date_key" ON "DailyStats"("date");
CREATE INDEX IF NOT EXISTS "DailyStats_date_idx" ON "DailyStats"("date");
```

#### 4. 退出 psql 并重启服务

```sql
-- 退出 psql
\q
```

```bash
# 重新生成 Prisma Client
cd /root/techblog
npx prisma generate

# 重启 PM2
pm2 restart techblog
```

---

## 📋 验证修复

### 1. 检查表是否存在

```bash
# 连接到数据库
psql -U root -d techblog_labs

# 检查表
\dt

# 应该看到 Visit 和 DailyStats 表
```

### 2. 测试 API 接口

```bash
# 在服务器上测试
curl http://localhost:3000/api/admin/stats/dimensions?days=7

# 应该返回 JSON 数据
```

### 3. 在浏览器中访问

- http://www.zysoo.top/api/admin/stats/dimensions?days=7

---

## 🔍 其他错误说明

### 1. OAuthAccountNotLinked 错误

```
[auth][error] OAuthAccountNotLinked: Another account already exists with the same e-mail address.
```

**原因**：用户尝试用 GitHub 登录时，邮箱已经绑定了其他账号。

**解决方案**：
- 使用已绑定的账号登录
- 或者联系管理员解除账号绑定

### 2. Next.js standalone 模式警告

```
⚠ "next start" does not work with "output: standalone" configuration. Use "node .next/standalone/server.js" instead.
```

**原因**：Next.js 配置了 `output: 'standalone'`，但使用了 `next start` 命令。

**解决方案**：

修改 PM2 启动命令：

```bash
# 停止当前进程
pm2 stop techblog

# 使用正确的启动命令
pm2 start .next/standalone/server.js --name techblog -- -p 3000

# 保存配置
pm2 save
```

或者修改 `next.config.mjs`，移除 `output: 'standalone'`：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除或注释掉这行
  // output: 'standalone',
}

module.exports = nextConfig
```

然后重新构建：

```bash
npx next build
pm2 restart techblog
```

---

## ✅ 修复完成检查清单

- [ ] Visit 表创建成功
- [ ] DailyStats 表创建成功
- [ ] Prisma Client 重新生成
- [ ] PM2 进程重启
- [ ] API 接口正常返回数据
- [ ] 网站可以正常访问

---

## 📞 如果还有问题

1. **查看 PM2 日志**：
   ```bash
   pm2 logs techblog --err --lines 50
   ```

2. **检查数据库表**：
   ```bash
   psql -U root -d techblog_labs -c "\dt"
   ```

3. **测试数据库连接**：
   ```bash
   psql -U root -d techblog_labs -c "SELECT 1;"
   ```

4. **告诉我具体的错误信息**，我会帮你进一步排查！
