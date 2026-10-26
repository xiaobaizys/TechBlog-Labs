# TechBlog Labs · VitaLog

一个基于 **Next.js 14 App Router** 的全栈个人博客与创意实验室。除了文章发布，还包含用户体系、评论互动、AI 问答、访客统计、监控告警与 A/B 测试等完整能力。

## 功能特性

### 前台
- **博客**：文章列表 / 详情 / 标签归档 / 相关推荐 / 点赞 / 评论（树形回复 + 审核）/ 代码高亮 / 文章海报 / PDF 导出
- **项目展示**：技术栈筛选、项目详情、源码包下载
- **生活分享**：图文动态发布、点赞、个人主页聚合
- **搜索**：全文检索、联想词、关键词高亮
- **用户中心**：注册登录、资料编辑、头像上传、找回密码
- **其他**：友链申请、RSS / sitemap / robots、PWA 离线访问、Web Push 订阅

### 后台（/admin）
仪表盘、文章 / 项目 / 生活动态管理、评论审核、用户与角色管理、站点配置、首页背景图、AI 提供商与 Key、访客地图、数据分析、缓存管理、监控告警、A/B 测试、友链审核。

### AI 能力
- 基于文章切片的 RAG 问答，支持流式输出与「当前页面上下文」
- 文章摘要、标签生成等工具接口
- 按用户 / 按天配额控制，提供商可在后台切换

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 框架 | Next.js 14（App Router）、React 18、TypeScript |
| 样式 | Tailwind CSS、next-themes、Framer Motion / GSAP |
| 数据库 | PostgreSQL、Prisma 5 |
| 认证 | NextAuth v5（JWT）、Prisma Adapter、GitHub OAuth、邮箱密码 + 滑块验证 |
| 缓存 | 进程内存 + Redis + Next `unstable_cache` + PWA Service Worker |
| AI | AI SDK、DeepSeek、LangChain、ChromaDB（可选） |
| 实时 | Socket.io + Redis Adapter |
| 监控 | Sentry、自建告警系统 |
| 内容渲染 | next-mdx-remote、remark / rehype |
| 部署 | PM2 + nginx，或 Docker（standalone） |

## 目录结构

```
src/
├── app/
│   ├── (main)/        # 前台页面：首页、博客、项目、生活、关于、搜索、个人中心
│   ├── (auth)/        # 登录、注册、找回密码
│   ├── admin/         # 后台管理页面
│   └── api/           # Route Handlers（内容、认证、AI、统计、上传等）
├── components/        # 按领域拆分的 UI 组件
├── lib/               # 认证、缓存、AI、限流、验证码、统计等核心逻辑
└── middleware.ts      # 访客统计埋点、测试页拦截
prisma/schema.prisma   # 数据模型
public/                # 静态资源与 PWA 图标
```

## 快速开始

### 环境要求
- Node.js 18+（推荐 20）
- PostgreSQL 14+
- Redis（可选，缺失时验证码 / 限流自动降级）

### 安装与启动

```bash
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，至少填写 AUTH_SECRET 与 DATABASE_URL

# 初始化数据库
npx prisma generate
npm run db:push

npm run dev
```

访问 http://localhost:3000 。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `AUTH_SECRET` | 是 | NextAuth 签名密钥，`openssl rand -base64 32` 生成 |
| `DATABASE_URL` | 是 | PostgreSQL 连接串 |
| `DIRECT_URL` | 否 | Prisma 迁移直连串（Supabase 等需要） |
| `NEXTAUTH_URL` | 否 | 站点地址，默认 `http://localhost:3000` |
| `REDIS_URL` | 否 | 默认 `redis://localhost:6379` |
| `REDIS_DISABLED` | 否 | 设为 `1` 可禁用 Redis 相关能力 |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | 否 | GitHub OAuth 登录 |
| `DEEPSEEK_API_KEY` | 否 | AI 助手默认模型密钥 |
| `NEXT_PUBLIC_SITE_URL` | 否 | RSS / Sitemap 使用的公开站点地址 |
| `SENTRY_DSN` | 否 | Sentry 错误监控 |

完整模板见 [.env.example](.env.example)。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务 |
| `npm run start:custom` | 使用自定义 `server.ts`（启用 Socket.io） |
| `npm run lint` | ESLint 检查 |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:push` | 同步 Schema 到数据库 |
| `npm run db:migrate` | 创建并执行迁移 |
| `npm run db:studio` | 打开 Prisma Studio |
| `npm run db:seed-admin` | 创建 / 重置本地管理员账号 |
| `npm run sync:md` | 同步本地 Markdown 到数据库 |
| `npm run embed` | 为文章生成 RAG 切片 |

## 部署

### PM2 + nginx

```bash
npm run build
npm run start:custom   # 或 pm2 start npm --name techblog -- run start
```

详细流程与常见问题见 [DEPLOY.md](DEPLOY.md)。

### Docker

```bash
docker build -t techblog-labs .
docker run -p 3000:3000 --env-file .env.production techblog-labs
```

## 说明

- 所有敏感配置请放在 `.env.local` / `.env.production`，这两个文件已被 `.gitignore` 忽略。
- `npm run db:seed-admin` 会创建固定开发账号，**请勿在生产环境使用或及时修改密码**。
- `public/sw.js`、`public/workbox-*.js` 由 next-pwa 在构建时自动生成，不纳入版本管理。
