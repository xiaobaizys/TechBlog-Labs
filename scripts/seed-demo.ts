/**
 * 演示数据种子脚本
 *
 * 用法: npx tsx scripts/seed-demo.ts
 *
 * 功能:
 * - 创建示例标签
 * - 创建示例博客文章
 * - 创建示例项目
 * - 创建示例生活分享
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================
// 示例数据
// ============================================================

const TAGS = [
  { name: "Next.js", slug: "nextjs" },
  { name: "React", slug: "react" },
  { name: "TypeScript", slug: "typescript" },
  { name: "JavaScript", slug: "javascript" },
  { name: "Node.js", slug: "nodejs" },
  { name: "数据库", slug: "database" },
  { name: "DevOps", slug: "devops" },
  { name: "AI", slug: "ai" },
  { name: "前端", slug: "frontend" },
  { name: "后端", slug: "backend" },
  { name: "全栈", slug: "fullstack" },
  { name: "性能优化", slug: "performance" },
];

const POSTS = [
  {
    title: "Next.js 14 新特性详解：App Router 与 Server Components",
    slug: "nextjs-14-app-router-server-components",
    content: `
## 什么是 App Router？

Next.js 13 引入了全新的 App Router，它基于 React Server Components 构建，提供了更好的性能和开发体验。

### 主要特性

1. **React Server Components** - 默认服务端渲染，减少客户端 JavaScript
2. **嵌套布局** - 支持复杂的布局结构，无需重复渲染
3. **流式渲染** - 支持 Suspense，逐步加载页面内容
4. **简化数据获取** - 直接在组件中使用 async/await

### 示例代码

\`\`\`tsx
// app/page.tsx - 这是一个 Server Component
export default async function HomePage() {
  const posts = await fetch('https://api.example.com/posts').then(r => r.json());

  return (
    <div>
      <h1>最新文章</h1>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
\`\`\`

## Server Components vs Client Components

| 特性 | Server Component | Client Component |
|------|------------------|------------------|
| 渲染位置 | 服务端 | 客户端 |
| JavaScript | 不发送到客户端 | 发送到客户端 |
| 数据获取 | 直接访问数据库 | 需要 API |
| 交互性 | 无 | 有 |

## 总结

App Router 是 Next.js 的未来方向，建议新项目都采用这种方式构建。
    `,
    excerpt: "深入了解 Next.js 14 的 App Router 和 Server Components，掌握现代全栈开发的核心技术。",
    tags: ["nextjs", "react", "typescript", "frontend"],
  },
  {
    title: "PostgreSQL 性能优化实战：索引、查询与配置",
    slug: "postgresql-performance-optimization",
    content: `
## 数据库性能优化概述

PostgreSQL 是一个功能强大的开源关系型数据库，但在高并发场景下需要进行适当的优化。

### 索引优化

#### 1. B-Tree 索引

最常用的索引类型，适用于等值查询和范围查询：

\`\`\`sql
-- 为常用查询字段创建索引
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published ON posts(published, published_at DESC);
\`\`\`

#### 2. 复合索引

多字段查询时使用复合索引：

\`\`\`sql
-- 覆盖常见查询场景
CREATE INDEX idx_posts_status_created
ON posts(status, created_at DESC)
WHERE deleted_at IS NULL;
\`\`\`

### 查询优化

1. **使用 EXPLAIN ANALYZE** 分析查询计划
2. **避免 SELECT *** - 只查询需要的字段
3. **合理使用 JOIN** - 避免 N+1 查询问题

### 配置调优

\`\`\`ini
# postgresql.conf 关键配置
shared_buffers = 4GB          # 内存的 25%
effective_cache_size = 12GB   # 内存的 75%
work_mem = 64MB               # 排序/哈希操作内存
maintenance_work_mem = 512MB  # 维护操作内存
\`\`\`

## 总结

数据库优化是一个持续的过程，需要根据实际负载情况不断调整。
    `,
    excerpt: "PostgreSQL 性能优化实战指南，涵盖索引设计、查询优化和配置调优。",
    tags: ["database", "performance", "backend"],
  },
  {
    title: "Docker Compose 部署 Next.js 应用完整指南",
    slug: "docker-compose-nextjs-deployment",
    content: `
## 为什么使用 Docker？

Docker 可以确保开发、测试和生产环境的一致性，避免"在我机器上能跑"的问题。

### 项目结构

\`\`\`
project/
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
└── src/
\`\`\`

### Dockerfile

\`\`\`dockerfile
FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

### docker-compose.yml

\`\`\`yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/blog
      - NEXTAUTH_SECRET=\${NEXTAUTH_SECRET}
    depends_on:
      - db
      - redis

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

volumes:
  postgres_data:
  redis_data:
\`\`\`

## 总结

Docker Compose 简化了多容器应用的部署和管理，是现代 Web 应用的标准部署方式。
    `,
    excerpt: "使用 Docker Compose 部署 Next.js 应用，包含 PostgreSQL 和 Redis 的完整配置。",
    tags: ["devops", "nextjs", "backend"],
  },
  {
    title: "TypeScript 高级类型体操：从入门到精通",
    slug: "typescript-advanced-type-gymnastics",
    content: `
## 为什么需要高级类型？

TypeScript 的类型系统非常强大，掌握高级类型可以帮助我们编写更安全、更易维护的代码。

### 条件类型

\`\`\`typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false
\`\`\`

### 映射类型

\`\`\`typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Partial<T> = {
  [P in keyof T]?: T[P];
};
\`\`\`

### 模板字面量类型

\`\`\`typescript
type EventName<T extends string> = \\\`on\${Capitalize<T>}\\\`;

type ClickEvent = EventName<'click'>; // 'onClick'
type FocusEvent = EventName<'focus'>; // 'onFocus'
\`\`\`

### 递归类型

\`\`\`typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};
\`\`\`

## 实战案例

### API 响应类型

\`\`\`typescript
type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}>;
\`\`\`

## 总结

高级类型是 TypeScript 的精华所在，掌握它们可以大幅提升代码质量。
    `,
    excerpt: "深入探索 TypeScript 高级类型系统，掌握条件类型、映射类型、模板字面量等高级特性。",
    tags: ["typescript", "javascript", "frontend"],
  },
  {
    title: "React 状态管理方案对比：Context vs Redux vs Zustand",
    slug: "react-state-management-comparison",
    content: `
## 状态管理概述

React 生态中有多种状态管理方案，选择合适的方案对项目至关重要。

### React Context

内置方案，适合简单场景：

\`\`\`tsx
const ThemeContext = createContext('light');

function App() {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <ChildComponent />
    </ThemeContext.Provider>
  );
}
\`\`\`

**优点：**
- 内置，无需额外依赖
- 简单易用

**缺点：**
- 性能问题（Context 变化会导致所有消费者重渲染）
- 不适合复杂状态逻辑

### Redux

经典方案，适合大型应用：

\`\`\`typescript
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1; },
    decrement: (state) => { state.value -= 1; },
  },
});
\`\`\`

**优点：**
- 成熟的生态系统
- 强大的 DevTools
- 可预测的状态更新

**缺点：**
- 样板代码较多
- 学习曲线较陡

### Zustand

轻量级方案，现代 React 首选：

\`\`\`typescript
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));
\`\`\`

**优点：**
- 极简 API
- 无 Provider 包裹
- 优秀的性能

**缺点：**
- 生态系统相对较小

## 如何选择？

| 场景 | 推荐方案 |
|------|----------|
| 简单全局状态 | Context |
| 大型企业应用 | Redux |
| 中小型项目 | Zustand |
| 服务端状态 | React Query / SWR |

## 总结

没有最好的方案，只有最适合的方案。根据项目规模和团队熟悉度选择。
    `,
    excerpt: "对比 React 三大状态管理方案：Context、Redux 和 Zustand，帮你选择最适合的方案。",
    tags: ["react", "frontend", "javascript"],
  },
];

const PROJECTS = [
  {
    title: "TechBlog Labs",
    slug: "techblog-labs",
    description: "基于 Next.js 14 的现代全栈博客平台，支持 AI 对话、Markdown 渲染、暗色模式等功能。",
    techStack: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Tailwind CSS"],
    repoUrl: "https://github.com/your-username/techblog-labs",
    demoUrl: "https://techblog-labs.vercel.app",
    featured: true,
  },
  {
    title: "AI Chat Assistant",
    slug: "ai-chat-assistant",
    description: "基于 DeepSeek 的智能对话助手，支持多轮对话、上下文理解、RAG 增强。",
    techStack: ["Next.js", "DeepSeek API", "LangChain", "Vector DB"],
    repoUrl: "https://github.com/your-username/ai-chat-assistant",
    featured: true,
  },
  {
    title: "Task Flow",
    slug: "task-flow",
    description: "可视化任务管理工具，支持拖拽排序、标签分类、团队协作。",
    techStack: ["React", "TypeScript", "DnD Kit", "Zustand"],
    repoUrl: "https://github.com/your-username/task-flow",
  },
];

const LIFE_POSTS = [
  {
    content: "今天终于把博客的 RSS Feed 和 Sitemap 功能完善了！SEO 优化又进了一步 🎉",
    images: [],
  },
  {
    content: "分享一个开发小技巧：使用 TypeScript 的模板字面量类型可以大大提升代码的类型安全性。\n\n比如定义事件名称：\n\`\`\`typescript\ntype EventName<T extends string> = \`on\${Capitalize<T>}\`;\n\`\`\`\n\n这样就能在编译时捕获拼写错误！",
    images: [],
  },
  {
    content: "周末去了趟咖啡馆，带着笔记本写了一下午代码。阳光、咖啡、代码，完美的一天 ☕️💻",
    images: [],
  },
];

// ============================================================
// 种子数据主函数
// ============================================================

async function main() {
  console.log("🌱 开始创建演示数据...\n");

  // 1. 创建标签
  console.log("📌 创建标签...");
  const createdTags: Record<string, string> = {};

  for (const tag of TAGS) {
    const created = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
    createdTags[tag.slug] = created.id;
    console.log(`  ✓ ${tag.name}`);
  }

  // 2. 获取或创建管理员用户
  console.log("\n👤 查找管理员用户...");
  let adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!adminUser) {
    console.log("  ⚠️  未找到管理员用户，请先运行 seed-admin.ts 创建管理员");
    return;
  }
  console.log(`  ✓ 管理员: ${adminUser.name || adminUser.email}`);

  // 3. 创建博客文章
  console.log("\n📝 创建博客文章...");

  for (const post of POSTS) {
    const existing = await prisma.post.findUnique({
      where: { slug: post.slug },
    });

    if (existing) {
      console.log(`  ⏭️  已存在: ${post.title}`);
      continue;
    }

    const created = await prisma.post.create({
      data: {
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt,
        published: true,
        status: "PUBLISHED",
        publishedAt: new Date(),
        authorId: adminUser.id,
        tags: {
          create: post.tags.map((tagSlug) => ({
            tag: { connect: { slug: tagSlug } },
          })),
        },
      },
    });

    console.log(`  ✓ ${created.title}`);
  }

  // 4. 创建项目
  console.log("\n🚀 创建项目...");

  for (const project of PROJECTS) {
    const existing = await prisma.project.findUnique({
      where: { slug: project.slug },
    });

    if (existing) {
      console.log(`  ⏭️  已存在: ${project.title}`);
      continue;
    }

    const created = await prisma.project.create({
      data: {
        title: project.title,
        slug: project.slug,
        description: project.description,
        techStack: project.techStack,
        repoUrl: project.repoUrl,
        demoUrl: project.demoUrl,
        featured: project.featured || false,
        authorId: adminUser.id,
      },
    });

    console.log(`  ✓ ${created.title}`);
  }

  // 5. 创建生活分享
  console.log("\n🌟 创建生活分享...");

  for (const post of LIFE_POSTS) {
    const created = await prisma.lifePost.create({
      data: {
        content: post.content,
        images: post.images,
        authorId: adminUser.id,
      },
    });

    console.log(`  ✓ 生活分享 #${created.id.slice(0, 8)}`);
  }

  console.log("\n✅ 演示数据创建完成！");
  console.log("\n📊 数据统计:");
  console.log(`  - 标签: ${TAGS.length} 个`);
  console.log(`  - 文章: ${POSTS.length} 篇`);
  console.log(`  - 项目: ${PROJECTS.length} 个`);
  console.log(`  - 生活分享: ${LIFE_POSTS.length} 条`);
}

main()
  .catch((e) => {
    console.error("❌ 创建演示数据失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
