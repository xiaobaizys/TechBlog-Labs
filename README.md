# TechBlog-Labs

一个基于 Next.js 14 + Prisma + NextAuth 的个人博客实验室项目。

## 技术栈

- Next.js 14 (App Router)
- React 18 + TypeScript
- Prisma + PostgreSQL/SQLite
- NextAuth v5
- Tailwind CSS
- AI SDK (OpenAI / LangChain / ChromaDB)
- MDX 博客渲染

## 本地开发

```bash
npm install
npm run dev
```

默认运行在 http://localhost:3000

## 脚本命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm start` | 启动生产服务 |
| `npm run db:push` | 同步 Prisma schema 到数据库 |
| `npm run db:studio` | 打开 Prisma Studio |
| `npm run embed` | 将本地 MD 文章写入向量库 |
| `npm run sync:md` | 同步本地 MD 文件到数据库 |
