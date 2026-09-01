# VitaLog 部署与运维指南

## 一、环境要求

| 组件 | 用途 |
|------|------|
| Node.js 18+ | Next.js 运行时 |
| PostgreSQL | 主数据库 |
| Redis | 验证码 / 密码错误计数 |
| nginx | 反向代理 |
| PM2 | Node 进程管理 |

---

## 二、首次部署

### 1. 本地构建

```powershell
# 在项目根目录执行
cd "D:\A\9\个人博客\TechBlog-Labs"

# 清理旧缓存（重要：缓存可能包含过时 chunk，导致部署后 404）
Remove-Item -Recurse -Force .next

# 构建
npx next build
```

### 2. 打包上传

```powershell
# 删除 .next/cache（481MB+ 不用上传，服务器会自动生成）
Remove-Item -Recurse -Force .next\cache

# 打包（约 2-3MB）
tar -czf deploy.tar.gz .next .env.production package.json package-lock.json next.config.mjs tsconfig.json tailwind.config.ts postcss.config.mjs public/image/logo.png public/sw.js src prisma scripts

# 上传到服务器
scp deploy.tar.gz root@117.72.12.223:/root/techblog/
```

### 3. 服务器端部署

```bash
ssh root@117.72.12.223
cd /root/techblog

# 解压
tar -xzf deploy.tar.gz

# ⚠️ 关键：修复 DATABASE_URL（PostgreSQL 只监听 localhost）
sed -i 's|@117.72.12.223:5432|@localhost:5432|g' .env.production

# 安装依赖 + 生成 Prisma Client
npm install
npx prisma generate

# 启动（首次用 start，后续用 restart）
pm2 start npm --name techblog -- run start -- -p 3000
pm2 save
```

---

## 三、更新部署（日常上线）

```powershell
# === 本地 ===
cd "D:\A\9\个人博客\TechBlog-Labs"
Remove-Item -Recurse -Force .next
npx next build
Remove-Item -Recurse -Force .next\cache
tar -czf deploy.tar.gz .next .env.production package.json package-lock.json next.config.mjs tsconfig.json tailwind.config.ts postcss.config.mjs public/image/logo.png public/sw.js src prisma scripts
scp deploy.tar.gz root@117.72.12.223:/root/techblog/
```

```bash
# === 服务器 ===
cd /root/techblog
pm2 stop techblog
tar -xzf deploy.tar.gz
sed -i 's|@117.72.12.223:5432|@localhost:5432|g' .env.production
npm install
npx prisma generate
pm2 restart techblog
```

---

## 四、服务器重启后恢复

```bash
cd /root/techblog
pm2 resurrect    # 如果 pm2 save 过
# 或者手动：
pm2 start npm --name techblog -- run start -- -p 3000
```

---

## 五、常见问题及解决

### 1. 图片上传后 404

**原因**：Next.js 生产模式在启动时缓存 `public/` 目录文件列表，启动后新上传的文件虽然写入磁盘，但 Next.js 不感知。

**解决**：项目已实现动态路由 `/api/uploads/[filename]` 作为兜底。服务器重启后需要再上传一次新图片，或者重启 PM2 让 Next.js 重新扫描 `public/`。

如果图片批量不显示（如部署后丢失），需要额外上传图片到服务器：

```powershell
# 本地打包图片
tar -czf images.tar.gz public/image
scp images.tar.gz root@117.72.12.223:/root/techblog/
```

```bash
# 服务器解压
cd /root/techblog
tar -xzf images.tar.gz
pm2 restart techblog
```

### 2. 部署后注册/登录 500

**原因**：`.env.production` 中 `DATABASE_URL` 指向 `117.72.12.223:5432`，但 PostgreSQL 只监听 `localhost`。

**解决**：每次解压 `deploy.tar.gz` 后必须执行：

```bash
sed -i 's|@117.72.12.223:5432|@localhost:5432|g' .env.production
pm2 restart techblog
```

### 3. 中文标题文章无法访问（显示 "走丢了一页" / 404）

**原因**：Next.js 14 不会自动对 `params.slug` 做 URL decode，中文 slug 在 URL 中是编码形态（如 `%E6%9B%B4%E6%96%B0%E9%83%A8%E7%BD%B2` → `更新部署`），直接用编码后的 slug 查数据库会找不到文章，触发 `notFound()`。

**解决**：在 `src/app/(main)/blog/[slug]/page.tsx` 中对 `params.slug` 显式调用 `decodeURIComponent()`：

```ts
const slug = decodeURIComponent(params.slug);
const { data: post } = await getPost(slug, session?.user?.id);
```

### 4. 部署后页面静态资源 404（CSS/JS chunk 加载失败）

**原因**：`.next/cache` 残留了旧构建的 chunk hash，或服务器上新旧 `.next` 文件混合。

**解决**：

```powershell
# 本地必须 clean rebuild
Remove-Item -Recurse -Force .next
npx next build
```

### 5. PM2 进程频繁重启

查看日志排查具体错误：

```bash
pm2 logs techblog --err --lines 30
```

常见原因：
- 数据库连不上（检查 PostgreSQL 是否 running：`systemctl status postgresql`）
- Redis 挂了但应用 fail-open 设计通常不致命
- 环境变量缺失（`.env.production` 是否被覆盖）

### 6. nginx 502 Bad Gateway

**原因**：Next.js 没运行或 PM2 进程挂了。

**排查**：

```bash
pm2 status                    # 确认 techblog 是 online
curl http://localhost:3000/   # 确认 Next.js 在响应
```

如果 PM2 进程 online 但 localhost:3000 不响应，查看 PM2 日志。

### 7. 上传文件太大 413

**原因**：nginx 默认 `client_max_body_size` 只有 1MB。

**解决**：在 `/etc/nginx/nginx.conf` 的 `server` 块中添加：

```nginx
client_max_body_size 200m;
```

然后 `nginx -s reload`。

### 8. 服务端认证配置异常、登录第一次失败第二次却可以

**原因**：Redis 在 Next.js 首次启动时还没完全就绪（`lazyConnect: true`），captcha/store.ts 里的 Redis 操作 fail-open 返回了预期之外的值，导致 `isCaptchaRequired` 等函数返回异常，登录流程进入错误分支。

**表现**：输入正确用户名密码后第一次登录提示"服务端认证配置异常，请联系管理员"，不刷新页面再点一次登录就成功了。

**检查**：

```bash
redis-cli ping   # 确认 Redis 返回 PONG
```

**根本解决方案**（需后续改代码）：在 `auth.config.ts` 的 `authorize()` 中，Prisma 查 DB 失败时不再笼统地抛错误让 NextAuth 映射成 `Configuration`，而是区分不同失败原因返回具体中文错误消息。同时给 Redis 客户端加大重试次数或改为同步连接等待。

---

## 六、常用运维命令

```bash
# PM2
pm2 status                     # 查看进程状态
pm2 logs techblog --lines 50    # 查看最近 50 行日志
pm2 logs techblog --err         # 只看错误日志
pm2 restart techblog            # 重启
pm2 stop techblog               # 停止
pm2 start techblog              # 启动

# nginx
nginx -t                        # 检查配置语法
nginx -s reload                 # 重载配置

# 数据库
systemctl status postgresql     # PostgreSQL 状态
systemctl status redis-server   # Redis 状态
redis-cli ping                  # 测试 Redis 连接
```
