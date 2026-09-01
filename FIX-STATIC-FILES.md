# TechBlog-Labs 静态文件修复指南

## 🚨 问题描述

从浏览器控制台看到以下错误：

```
GET http://www.zysoo.top/manifest.json 404 (Not Found)
GET http://www.zysoo.top/icons/police-icon.svg 404 (Not Found)
```

这表明 `manifest.json` 和 `icons` 目录没有被正确打包到部署包中。

---

## 🔧 修复方案

### 方案一：使用修复脚本（推荐）

#### 1. 在本地执行修复脚本

```bash
# 在项目根目录执行
bash fix-static-files.sh
```

脚本会自动：
- 复制 `public/manifest.json` 和 `public/icons` 目录
- 打包并上传到服务器
- 在服务器上解压

---

### 方案二：手动修复（逐步执行）

#### 步骤 1：在本地打包静态文件

```bash
# 在项目根目录执行
cd "D:\A\9\个人博客\TechBlog-Labs"

# 创建临时目录
mkdir temp-static

# 复制 manifest.json
cp public/manifest.json temp-static/

# 复制 icons 目录
cp -r public/icons temp-static/

# 打包
cd temp-static
tar -czf static-files.tar.gz .
cd ..

# 上传到服务器
scp temp-static/static-files.tar.gz root@117.72.12.223:/root/techblog/

# 清理临时目录
rm -rf temp-static
```

#### 步骤 2：在服务器上解压

```bash
# SSH 连接到服务器
ssh root@117.72.12.223
cd /root/techblog

# 解压静态文件
tar -xzf static-files.tar.gz

# 删除压缩包
rm static-files.tar.gz

# 验证文件是否存在
ls -la manifest.json
ls -la icons/
```

#### 步骤 3：重启 PM2（可选）

```bash
# 重启 PM2 进程
pm2 restart techblog
```

---

### 方案三：修改打包命令（长期解决方案）

修改 `DEPLOY.md` 中的打包命令，包含整个 `public` 目录：

```bash
# 修改打包命令，包含整个 public 目录
tar -czf deploy.tar.gz .next .env.production package.json package-lock.json \
  next.config.mjs tsconfig.json tailwind.config.ts postcss.config.mjs \
  public src prisma scripts
```

---

## 📋 验证修复

### 1. 在浏览器中访问

- http://www.zysoo.top/manifest.json
- http://www.zysoo.top/icons/police-icon.svg

### 2. 检查控制台

打开浏览器开发者工具（F12），查看 Console 和 Network 标签：
- 应该不再看到 404 错误
- manifest.json 应该返回 JSON 内容
- police-icon.svg 应该返回 SVG 内容

---

## 🔍 常见问题排查

### 问题 1：文件上传后仍然 404

**原因**：Next.js 缓存了静态文件列表。

**解决方案**：

```bash
# 在服务器上
cd /root/techblog

# 重启 PM2
pm2 restart techblog

# 如果还不行，清理 Next.js 缓存
rm -rf .next/cache
pm2 restart techblog
```

### 问题 2：SSH 连接失败

**原因**：SSH 密钥或密码问题。

**解决方案**：

```bash
# 使用密码连接
ssh root@117.72.12.223

# 或者使用密钥
ssh -i ~/.ssh/id_rsa root@117.72.12.223
```

### 问题 3：scp 命令失败

**原因**：网络问题或权限问题。

**解决方案**：

```bash
# 使用密码上传
scp static-files.tar.gz root@117.72.12.223:/root/techblog/

# 或者使用 rsync
rsync -avz static-files.tar.gz root@117.72.12.223:/root/techblog/
```

---

## ✅ 修复完成检查清单

- [ ] `http://www.zysoo.top/manifest.json` 返回 200
- [ ] `http://www.zysoo.top/icons/police-icon.svg` 返回 200
- [ ] 浏览器控制台不再显示 404 错误
- [ ] 网站功能正常

---

## 📝 预防措施

### 1. 修改打包脚本

在 `package.json` 中添加打包脚本：

```json
{
  "scripts": {
    "deploy:pack": "tar -czf deploy.tar.gz .next .env.production package.json package-lock.json next.config.mjs tsconfig.json tailwind.config.ts postcss.config.mjs public src prisma scripts"
  }
}
```

### 2. 创建自动化部署脚本

创建 `deploy.sh`：

```bash
#!/bin/bash
set -e

echo "🚀 开始部署..."

# 清理
rm -rf .next

# 构建
npx next build

# 打包（包含整个 public 目录）
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

echo "✅ 部署完成！"
```

---

## 📞 如果还有问题

1. **检查服务器文件**：
   ```bash
   ssh root@117.72.12.223
   ls -la /root/techblog/manifest.json
   ls -la /root/techblog/icons/
   ```

2. **检查 PM2 日志**：
   ```bash
   pm2 logs techblog --err --lines 20
   ```

3. **告诉我具体的错误信息**，我会帮你进一步排查！
