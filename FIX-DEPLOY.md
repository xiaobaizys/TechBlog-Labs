# TechBlog-Labs 部署修复指南

## 🚨 问题列表

### 1. manifest.json 404
- **原因**：文件存在但未打包到部署包中
- **位置**：`public/manifest.json`

### 2. police-icon.svg 404
- **原因**：文件存在但未打包到部署包中
- **位置**：`public/icons/police-icon.svg`

### 3. 后台统计 API 500
- **原因**：Prisma Client 未正确生成或数据库表不存在
- **位置**：`src/app/api/admin/stats/dimensions/route.ts`

---

## 🔧 修复步骤

### 方案一：使用修复脚本（推荐）

#### 1. 上传修复脚本到服务器

```bash
# 在本地执行
scp fix-deploy.sh root@117.72.12.223:/root/techblog/
```

#### 2. 在服务器上执行修复脚本

```bash
# SSH 连接到服务器
ssh root@117.72.12.223
cd /root/techblog

# 给脚本执行权限
chmod +x fix-deploy.sh

# 执行修复脚本
./fix-deploy.sh
```

---

### 方案二：手动修复（逐步执行）

#### 步骤 1：检查文件是否存在

```bash
# 在服务器上
cd /root/techblog
ls -la public/manifest.json
ls -la public/icons/police-icon.svg
```

#### 步骤 2：重新生成 Prisma Client

```bash
npx prisma generate
```

#### 步骤 3：检查并创建数据库表

```bash
# 检查 Visit 表
npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Visit');"

# 检查 DailyStats 表
npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'DailyStats');"

# 如果表不存在，创建它们
npx prisma db push
```

#### 步骤 4：重新构建项目

```bash
npx next build
```

#### 步骤 5：重启 PM2

```bash
pm2 restart techblog
```

---

## 📋 验证修复

### 验证 manifest.json

```bash
# 在服务器上测试
curl -I http://localhost:3000/manifest.json

# 应该返回 HTTP 200
```

在浏览器中访问：
- http://www.zysoo.top/manifest.json

### 验证 police-icon.svg

```bash
# 在服务器上测试
curl -I http://localhost:3000/icons/police-icon.svg

# 应该返回 HTTP 200
```

在浏览器中访问：
- http://www.zysoo.top/icons/police-icon.svg

### 验证 API

```bash
# 在服务器上测试
curl http://localhost:3000/api/admin/stats/dimensions?days=7

# 应该返回 JSON 数据
```

在浏览器中访问：
- http://www.zysoo.top/api/admin/stats/dimensions?days=7

---

## 🔍 常见问题排查

### 问题 1：Prisma Client 生成失败

**错误信息**：
```
Error: @prisma/client did not initialize yet
```

**解决方案**：
```bash
# 重新安装依赖
npm install

# 重新生成 Prisma Client
npx prisma generate
```

### 问题 2：数据库表不存在

**错误信息**：
```
The table `public.Visit` does not exist
```

**解决方案**：
```bash
# 推送数据库 schema
npx prisma db push
```

### 问题 3：PM2 进程未启动

**错误信息**：
```
PM2 not found
```

**解决方案**：
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start npm --name techblog -- run start -- -p 3000
pm2 save
```

### 问题 4：构建失败

**错误信息**：
```
Build error occurred
```

**解决方案**：
```bash
# 清理缓存
rm -rf .next

# 重新构建
npx next build
```

---

## 📝 修复后检查清单

- [ ] `http://www.zysoo.top/manifest.json` 返回 200
- [ ] `http://www.zysoo.top/icons/police-icon.svg` 返回 200
- [ ] `http://www.zysoo.top/api/admin/stats/dimensions?days=7` 返回 200
- [ ] PM2 进程状态正常（`pm2 status`）
- [ ] 网站可以正常访问
- [ ] GitHub 登录功能正常

---

## 🛠️ 预防措施

### 1. 确保打包完整

在打包时包含所有必要的文件：

```bash
# 打包时包含 public 目录
tar -czf deploy.tar.gz .next .env.production package.json package-lock.json \
  next.config.mjs tsconfig.json tailwind.config.ts postcss.config.mjs \
  public src prisma scripts
```

### 2. 自动化部署脚本

创建 `deploy.sh` 脚本，包含所有必要的步骤：

```bash
#!/bin/bash
set -e

# 清理
rm -rf .next

# 构建
npx next build

# 打包
tar -czf deploy.tar.gz .next .env.production package.json package-lock.json \
  next.config.mjs tsconfig.json tailwind.config.ts postcss.config.mjs \
  public src prisma scripts

# 上传
scp deploy.tar.gz root@117.72.12.223:/root/techblog/

# 服务器部署
ssh root@117.72.12.223 "cd /root/techblog && \
  pm2 stop techblog && \
  tar -xzf deploy.tar.gz && \
  npx prisma generate && \
  pm2 restart techblog"
```

### 3. 定期备份

```bash
# 备份数据库
pg_dump -U root techblog_labs > backup_$(date +%Y%m%d).sql

# 备份项目文件
tar -czf backup_$(date +%Y%m%d).tar.gz /root/techblog
```

---

## 📞 获取帮助

如果问题仍然存在，请：

1. 查看 PM2 日志：`pm2 logs techblog --err --lines 50`
2. 检查数据库连接：`psql -U root -d techblog_labs -c "SELECT 1;"`
3. 检查 nginx 配置：`nginx -t`
4. 查看系统日志：`journalctl -u nginx -f`

---

## ✅ 完成

修复完成后，你的网站应该可以正常访问，所有功能应该正常工作。

如有问题，请提供具体的错误信息，我会帮你进一步排查。
