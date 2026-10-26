/**
 * 种子脚本：为管理员账号添加示例博客 / 项目 / 生活数据
 *
 * 用法：
 *   npx tsx scripts/seed-sample-data.ts
 *   npx tsx scripts/seed-sample-data.ts --clear  # 先清空再填充
 *
 * 依赖：数据库已启动、管理员账号已存在（admin@techblog.com）
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@techblog.com";

/* ================================================================
 * 数据定义
 * ================================================================ */

const POSTS = [
  {
    title: "从零搭建 Next.js 14 全栈博客",
    slug: "nextjs-fullstack-blog",
    excerpt: "记录使用 Next.js 14 App Router + Prisma + PostgreSQL 搭建个人博客的完整过程，涵盖数据库设计、认证系统、MDX 渲染等核心环节。",
    content: `## 项目背景

2024 年初，我决定重构自己的博客。之前用的是 Hexo 静态站点，虽然性能不错，但每次更新都要重新构建部署，交互性也比较差。于是决定用 **Next.js 14** 重新搭建一个全栈博客。

## 技术选型

| 层级 | 技术 | 选型理由 |
|------|------|----------|
| 框架 | Next.js 14 App Router | RSC + 流式渲染，SEO 友好 |
| 数据库 | PostgreSQL + Prisma | 类型安全 ORM，迁移方便 |
| 认证 | NextAuth v5 | 支持 Credentials + OAuth |
| 样式 | Tailwind CSS | 原子化 CSS，开发效率高 |
| 动画 | Framer Motion | 声明式动画，React 生态首选 |
| 内容 | MDX | Markdown + JSX，扩展性强 |

## 数据库设计

核心表结构：

\`\`\`
User ─── Post ─── Comment
  │         │
  │         ├── Tag (多对多)
  │         └── PostLike
  ├── LifePost ─── LifeLike
  └── Project ─── ProjectLike
\`\`\`

设计原则：

1. **cuid 主键**：避免自增 ID 暴露数据量
2. **软删除**：User 和 Post 保留 \`deletedAt\` 字段
3. **计数冗余**：\`likeCount\` / \`viewCount\` 避免频繁 COUNT 查询
4. **索引优化**：对高频查询字段（slug、status、createdAt）建立索引

## 认证系统

实现了三层防护：

- **密码强度**：bcryptjs 哈希，10 轮加盐
- **滑块验证码**：Redis 存储拼图数据，连续 3 次登录失败触发
- **速率限制**：固定窗口算法，500 次 / 60 秒

## 踩坑记录

1. **Prisma 适配器类型问题**：NextAuth v5 的 Prisma Adapter 类型定义不够完善，需要手动扩展 \`next-auth.d.ts\`

2. **MDX 服务端渲染**：\`next-mdx-remote\` 的 \`compileMDX\` 必须在服务端运行，不能混入客户端组件

3. **Redis 连接池**：ioredis 的 \`lazyConnect\` 在 HMR 时会产生僵尸连接，需要检测并清理

## 总结

整个项目从零到上线大约花了 3 周业余时间。最大的收获是对 Next.js 14 的 RSC 范式有了深入理解——哪些组件该放服务端、哪些必须客户端，这个判断力只能靠实际项目积累。

> 代码开源在 GitHub，感兴趣的可以看看。
`,
    coverImage: "/image/background (1).png",
    published: true,
    status: "PUBLISHED" as const,
    featured: true,
    publishedAt: new Date("2025-06-01"),
    tags: ["Next.js", "TypeScript", "PostgreSQL", "Prisma"],
  },
  {
    title: "TypeScript 高级类型体操：从 infer 到模板字面量",
    slug: "typescript-advanced-types",
    excerpt: "深入探索 TypeScript 类型系统的进阶用法，包括条件类型、infer 关键字、模板字面量类型和递归类型的实战应用。",
    content: `## 为什么需要类型体操

TypeScript 的类型系统是**图灵完备**的。这意味着你可以在类型层面实现相当复杂的逻辑。虽然大部分业务代码不需要如此深入，但当你设计通用库、工具函数或类型安全的 API 时，这些技巧能大幅提升开发体验。

## Conditional Types 条件类型

\`\`\`typescript
// 基本语法
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">;  // true
type B = IsString<42>;       // false

// 分布式条件类型 — 联合类型会自动分发
type ToArray<T> = T extends any ? T[] : never;
type C = ToArray<string | number>;  // string[] | number[]
\`\`\`

## infer 关键字

\`\`\`typescript
// 提取函数返回值类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 提取 Promise 内层类型
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

// 提取数组元素
type ArrayItem<T> = T extends (infer U)[] ? U : never;

// 实战：提取 API 响应类型
type ApiResponse<T> = {
  data: T;
  message: string;
};
type ExtractData<R> = R extends ApiResponse<infer D> ? D : never;
\`\`\`

## 模板字面量类型 (TS 4.1+)

\`\`\`typescript
// 字符串拼接类型
type Greeting = \`Hello, \${string}!\`;

// 实用案例：事件系统
type EventName = "click" | "focus" | "blur";
type HandlerName = \`on\${Capitalize<EventName>}\`;
// "onClick" | "onFocus" | "onBlur"

// 路由参数提取
type RouteParams<T extends string> =
  T extends \`\${string}/:\${infer P}/\${infer Rest}\`
    ? { [K in P | keyof RouteParams<Rest>]: string }
    : T extends \`\${string}/:\${infer P}\`
    ? { [K in P]: string }
    : {};

type UserParams = RouteParams<"/user/:id/post/:postId">;
// { id: string; postId: string }
\`\`\`

## 递归类型

\`\`\`typescript
// DeepReadonly
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? T[K] extends Function
      ? T[K]
      : DeepReadonly<T[K]>
    : T[K];
};

// DeepPartial
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Function
      ? T[K]
      : DeepPartial<T[K]>
    : T[K];
};

// JSON 类型
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
\`\`\`

## 实战技巧

### 1. 类型安全的 Event Emitter

\`\`\`typescript
type EventMap = {
  userLogin: { userId: string; timestamp: number };
  pageView: { path: string; referrer: string };
  error: { code: number; message: string };
};

class TypedEmitter<T extends Record<string, any>> {
  private handlers = new Map<keyof T, Set<Function>>();

  on<K extends keyof T>(event: K, handler: (data: T[K]) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  emit<K extends keyof T>(event: K, data: T[K]) {
    this.handlers.get(event)?.forEach((fn) => fn(data));
  }
}
\`\`\`

### 2. Builder Pattern 类型约束

\`\`\`typescript
type Builder<T, K extends keyof T = never> = {
  [P in keyof T as P extends K ? never : P]: (
    value: T[P]
  ) => Builder<T, K | P>;
} & { build: () => T };
\`\`\`

## 总结

TypeScript 类型体操不是炫技，而是让你写出**更精确的类型约束**，让编译器帮你发现更多潜在 bug。建议从条件类型和 infer 开始练习，逐步过渡到模板字面量和递归类型。

> 工具推荐：[type-challenges](https://github.com/type-challenges/type-challenges) 提供了大量练习题。
`,
    coverImage: "/image/background (2).jpg",
    published: true,
    status: "PUBLISHED" as const,
    featured: true,
    publishedAt: new Date("2025-06-05"),
    tags: ["TypeScript", "前端"],
  },
  {
    title: "设计一个滑块验证码系统",
    slug: "slider-captcha-design",
    excerpt: "深入讲解滑块验证码的生成、验证和防破解机制，包括 SVG 拼图生成、Redis 存储策略和频率限制的完整实现。",
    content: `## 为什么自建验证码

市面上的验证码服务（极验、腾讯云）大多收费且需要外部网络请求。对于个人博客来说，一个轻量级的滑块验证码足以应对机器注册和暴力破解。

## 整体架构

\`\`\`
┌──────────┐     ┌──────────┐     ┌──────────┐
│ 前端组件  │────▶│ API 路由  │────▶│  Redis   │
│ Slider   │     │ challenge│     │  存储    │
│ Captcha  │     │ verify   │     │ 状态    │
└──────────┘     └──────────┘     └──────────┘
       ▲                │
       └────────────────┘
          SSE / poll
\`\`\`

## 核心实现

### 1. SVG 拼图生成

\`\`\`typescript
// captcha/generator.ts
interface PuzzlePiece {
  svg: string;        // 拼图块 SVG
  bgSvg: string;      // 背景图 SVG
  targetX: number;    // 正确位置
  tolerance: number;  // 容差范围（px）
}

function generatePuzzle(width: number, height: number): PuzzlePiece {
  // 随机生成拼图缺口形状
  const pieceWidth = 50 + Math.random() * 30;
  const pieceHeight = 50 + Math.random() * 30;
  const targetX = 20 + Math.random() * (width - pieceWidth - 40);

  // 使用 SVG path 绘制不规则拼图形状
  const path = \`M0,0 L\${pieceWidth},0 L\${pieceWidth},\${pieceHeight}
    L0,\${pieceHeight} Z\`;

  // 生成背景干扰图案
  const noisePattern = generateNoisePattern(width, height);

  // 缺口效果：在背景上"挖掉"拼图区域
  const bgWithHole = \`...\`;

  return { svg: path, bgSvg: bgWithHole, targetX, tolerance: 5 };
}
\`\`\`

### 2. Redis 存储策略

\`\`\`typescript
// captcha/store.ts
const CAPTCHA_PREFIX = "captcha:";
const CAPTCHA_TTL = 300; // 5 分钟过期

async function storeChallenge(
  challengeId: string,
  targetX: number,
  ip: string
) {
  const key = \`\${CAPTCHA_PREFIX}\${challengeId}\`;
  await redis.set(
    key,
    JSON.stringify({ targetX, ip, createdAt: Date.now() }),
    "EX",
    CAPTCHA_TTL
  );
}
\`\`\`

### 3. 防破解机制

- **一次性使用**：验证成功或失败后立即删除 Redis 中的 challenge
- **时间窗口检测**：记录从挑战生成到提交的时间，拒绝过快（<200ms，明显是脚本）或过慢（>5min）
- **IP 频率限制**：同一 IP 每分钟最多请求 5 次挑战
- **客户端指纹**：在 Cookie 中存储客户端标识，防止复用验证结果

### 4. 前端交互

滑块组件需要处理：

- **触摸事件**：PC 端 mousedown/mousemove/mouseup，移动端 touchstart/touchmove/touchend
- **动画反馈**：松手后自动回弹或吸附到正确位置
- **无障碍**：支持键盘左右箭头微调位置

## 效果展示

- 验证通过率：~95%（真人用户）
- 误拦截率：<3%
- 平均验证时间：1.8 秒

## 总结

自建滑块验证码的投入产出比很高——核心代码不到 300 行，却有效拦截了所有自动化攻击。关键是**限制挑战频率 + 一次性使用 + 行为检测**这三层防护。
`,
    coverImage: "/image/background (3).jpg",
    published: true,
    status: "PUBLISHED" as const,
    featured: false,
    publishedAt: new Date("2025-06-10"),
    tags: ["Node.js", "Redis", "安全"],
  },
  {
    title: "Framer Motion 动画编排实战",
    slug: "framer-motion-orchestration",
    excerpt: "掌握 Framer Motion 的动画编排能力：stagger、orchestration、layout animation 和手势动画的完整案例。",
    content: `## 动画哲学

好的动效不是炫技，而是**引导注意力**和**传达状态变化**。Framer Motion 提供了声明式的 API，让我们能专注于"做什么动画"而非"怎么算关键帧"。

## 基础概念

### Variants — 命名状态

\`\`\`tsx
const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  },
  exit: { opacity: 0, y: -20 }
};

<motion.div
  variants={variants}
  initial="hidden"
  animate="visible"
  exit="exit"
/>
\`\`\`

### Orchestration — 编排

\`\`\`tsx
const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,    // 子元素间隔
      delayChildren: 0.2,        // 延迟启动
      when: "beforeChildren",    // 先执行父元素
    }
  }
};

const item = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};
\`\`\`

## 实战案例

### 1. 页面过渡动画

\`\`\`tsx
// AnimatePresence 处理组件卸载动画
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
</AnimatePresence>
\`\`\`

### 2. 列表重排动画

\`\`\`tsx
// layout 属性自动计算位置变化
<motion.div layout>
  {items.map(item => (
    <motion.div
      key={item.id}
      layout
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
    >
      {item.content}
    </motion.div>
  ))}
</motion.div>
\`\`\`

### 3. 手势动画

\`\`\`tsx
<motion.div
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  drag="x"
  dragConstraints={{ left: -100, right: 100 }}
  dragElastic={0.2}
  onDragEnd={(_, info) => {
    if (Math.abs(info.offset.x) > 50) {
      // 滑动超过阈值，触发操作
    }
  }}
/>
\`\`\`

## 性能优化

1. **useReducedMotion**：尊重用户偏好设置
2. **layout="position"**：仅对 position 做 layout 动画，跳过尺寸变化
3. **will-change**：对频繁动画的元素手动设置 \`will-change: transform\`
4. **LazyMotion**：按需加载动画特性，减少初始 bundle 体积

## 总结

Framer Motion 的优势在于**声明式 API** 和 **layout animation**。前者让动画逻辑清晰可读，后者则消除了手动计算位置的噩梦。如果你的项目已经在用 React，它是最自然的动画方案。
`,
    coverImage: "/image/background (4).jpg",
    published: true,
    status: "PUBLISHED" as const,
    featured: false,
    publishedAt: new Date("2025-06-15"),
    tags: ["React", "前端", "CSS"],
  },
  {
    title: "Redis 在个人项目中的 5 个实用场景",
    slug: "redis-practical-usage",
    excerpt: "不限于缓存——分享 Redis 在速率限制、验证码存储、会话管理、AI 配额和实时计数中的实际应用。",
    content: `## 写在前面

很多人把 Redis 仅仅当作缓存，但在小项目中，Redis 更像一个**瑞士军刀**。本文分享我在 TechBlog 项目中用 Redis 解决的 5 个实际问题。

## 1. 速率限制（Rate Limiting）

\`\`\`typescript
// 固定窗口算法
async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now();
  const windowKey = \`ratelimit:\${key}:\${Math.floor(now / windowMs)}\`;

  const count = await redis.incr(windowKey);
  if (count === 1) {
    await redis.expire(windowKey, Math.ceil(windowMs / 1000));
  }
  return count <= maxRequests;
}

// 使用场景：登录接口 5次/分钟，AI 接口 10次/天
\`\`\`

## 2. 验证码存储

\`\`\`typescript
// 生成验证码
const challengeId = randomUUID();
await redis.set(
  \`captcha:\${challengeId}\`,
  JSON.stringify({ targetX, ip }),
  "EX",
  300  // 5分钟过期
);

// 验证码核验（一次性使用）
const data = await redis.getdel(\`captcha:\${challengeId}\`);
if (!data) throw new Error("验证码已过期");
\`\`\`

## 3. 会话缓存

NextAuth 默认使用 JWT，但如果你需要服务器端强制失效：

\`\`\`typescript
// 黑名单机制
async function invalidateSession(sessionToken: string) {
  const decoded = jwt.decode(sessionToken);
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) {
    await redis.set(\`blacklist:\${sessionToken}\`, "1", "EX", ttl);
  }
}
\`\`\`

## 4. AI 调用配额

\`\`\`typescript
// 每日配额管理
async function checkAIQuota(userId: string, maxPerDay: number) {
  const today = new Date().toISOString().slice(0, 10);
  const key = \`ai-quota:\${userId}:\${today}\`;

  const count = await redis.incr(key);
  if (count === 1) {
    // 首次设置，第二天凌晨过期
    await redis.expireat(key, getEndOfDay());
  }
  return { allowed: count <= maxPerDay, remaining: maxPerDay - count };
}
\`\`\`

## 5. 实时计数（点赞/阅读）

\`\`\`typescript
// 写回策略：先在 Redis 中累加，定期同步到 DB
async function incrementView(postId: string) {
  await redis.zincrby("post:views", 1, postId);
}

// 定时任务：每分钟同步一次
setInterval(async () => {
  const tops = await redis.zrangebyscore(
    "post:views", 1, "+inf", "WITHSCORES"
  );
  for (let i = 0; i < tops.length; i += 2) {
    await prisma.post.update({
      where: { id: tops[i] },
      data: { viewCount: { increment: parseInt(tops[i + 1]) } },
    });
  }
  await redis.del("post:views");
}, 60_000);
\`\`\`

## 部署注意事项

- **fail-open 设计**：Redis 不可用时降级放行，不阻塞正常业务
- **内存上限**：设置 \`maxmemory\` + 淘汰策略（allkeys-lru）
- **持久化**：个人项目用 RDB 足够，AOF 写入开销对低配机器不划算

## 总结

Redis 在个人项目中的价值被严重低估了。以上 5 个场景的代码加起来不到 300 行，但为系统提供了生产级的防护能力。
`,
    published: true,
    status: "PUBLISHED" as const,
    featured: true,
    publishedAt: new Date("2025-06-20"),
    tags: ["Redis", "Node.js", "后端"],
  },
];

const PROJECTS = [
  {
    title: "VitaLog 个人博客",
    slug: "vitalog-blog",
    description: "全栈个人博客系统，支持 Markdown/MDX 写作、AI 辅助标签生成、滑块验证码、全文搜索和 RAG 对话。",
    content: `## 技术栈\n\n- **框架**: Next.js 14 + TypeScript\n- **数据库**: PostgreSQL + Prisma ORM\n- **认证**: NextAuth v5 (Credentials + GitHub OAuth)\n- **缓存**: Redis (ioredis)\n- **AI**: LangChain + ChromaDB + DeepSeek/OpenAI\n- **样式**: Tailwind CSS + Framer Motion\n- **部署**: Linux 服务器手动部署\n\n## 核心功能\n\n- 博客 CRUD + MDX 渲染\n- 滑块验证码 + 速率限制\n- AI RAG 对话（流式 SSE）\n- 全文搜索\n- 项目管理 + 源代码下载\n- 生活动态分享\n- Admin 后台管理`,
    techStack: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Redis", "Tailwind CSS", "Framer Motion"],
    isPublic: true,
    featured: true,
  },
  {
    title: "Shichen — 中国传统时辰",
    slug: "shichen-clock",
    description: "一个展示中国传统十二时辰的交互式时钟应用，根据当前时间自动匹配对应的时辰，并显示诗意描述。",
    content: `## 功能特点\n\n- 根据用户本地时间自动匹配十二时辰\n- 每个时辰配有对应时间段、诗意描述和推荐活动\n- 昼夜模式自动切换\n- 响应式设计，适配移动端\n\n## 时辰对照\n\n| 时辰 | 时间 | 别称 |\n|------|------|------|\n| 子时 | 23:00-01:00 | 夜半 |\n| 丑时 | 01:00-03:00 | 鸡鸣 |\n| 寅时 | 03:00-05:00 | 平旦 |\n| 卯时 | 05:00-07:00 | 日出 |\n| 辰时 | 07:00-09:00 | 食时 |\n| 巳时 | 09:00-11:00 | 隅中 |\n| 午时 | 11:00-13:00 | 日中 |\n| 未时 | 13:00-15:00 | 日昳 |\n| 申时 | 15:00-17:00 | 晡时 |\n| 酉时 | 17:00-19:00 | 日入 |\n| 戌时 | 19:00-21:00 | 黄昏 |\n| 亥时 | 21:00-23:00 | 人定 |`,
    techStack: ["TypeScript", "React", "CSS"],
    isPublic: true,
    featured: true,
  },
  {
    title: "AI Chat SDK 封装",
    slug: "ai-chat-sdk",
    description: "基于 Vercel AI SDK 封装的通用 AI 对话组件，支持多 Provider 切换、流式响应、历史记录和 RAG 检索增强。",
    content: `## 模块设计\n\n- **provider/** — AI 提供商抽象层（DeepSeek / OpenAI）\n- **rag/** — RAG 检索增强模块（ChromaDB 向量存储）\n- **cache/** — 提示词缓存和语义缓存\n- **quota/** — 每日调用配额管理\n\n## API 设计\n\n客户端通过 SSE 接收流式响应，支持：\n- 中断生成\n- 重试\n- 历史会话切换`,
    techStack: ["TypeScript", "AI SDK", "ChromaDB", "LangChain"],
    repoUrl: "https://github.com/example/ai-chat-sdk",
    isPublic: true,
    featured: false,
  },
  {
    title: "TechBlog 管理后台",
    slug: "techblog-admin",
    description: "博客管理后台，提供数据分析仪表盘、内容管理、用户管理和系统配置功能。",
    content: `## 功能模块\n\n- **Dashboard**: 文章/项目/用户统计数据，Recharts 图表\n- **文章管理**: 列表 / 新建 / 编辑 / 软删除\n- **项目管理**: CRUD + 源代码上传\n- **评论审核**: 审核通过 / 删除\n- **用户管理**: 角色修改 / 软删除\n- **系统配置**: 站点标题 / SEO / 分页设置\n- **AI 管理**: Provider 配置 / API Key 管理\n- **首页管理**: 背景图片上传 / 排序`,
    techStack: ["Next.js", "TypeScript", "Recharts", "Tailwind CSS"],
    isPublic: false,
    featured: false,
  },
];

const LIFE_POSTS = [
  {
    content: "☕ 周末早晨的最佳状态：一杯手冲咖啡 + 一段专注编码时间。最近在重构博客的搜索模块，发现 Fuse.js 的模糊匹配在小数据集下比 Elasticsearch 更实用。",
    images: ["/image/背景 (1).png"],
    isPublic: true,
    createdAt: new Date("2025-06-12T08:30:00"),
  },
  {
    content: "📚 读完《代码整洁之道》的几点感悟：\n\n1. 好的命名胜过好的注释——变量名本身就应该是文档\n2. 函数应该只做一件事——如果一个函数需要「和」字来描述，就该拆分\n3. 注释是失败的补丁——当你觉得需要写注释时，先想想能否让代码自解释\n\n强烈推荐给所有开发者。",
    images: [],
    isPublic: true,
    createdAt: new Date("2025-06-11T20:00:00"),
  },
  {
    content: "🎨 最近迷上了流体艺术——把丙烯颜料倒在画布上让它自然流淌。编程讲究精确，而流体绘画则教会我拥抱随机性。两种截然不同的思维方式，意外地互补。",
    images: ["/image/背景 (2).png"],
    isPublic: true,
    createdAt: new Date("2025-06-10T15:20:00"),
  },
  {
    content: "🔧 分享一个调试技巧：遇到难以复现的 bug 时，用二分法注释代码来缩小范围，比盲猜高效 10 倍。今天用这个方法 5 分钟就定位了 Zustand 状态更新导致的无限循环问题。",
    images: [],
    isPublic: true,
    createdAt: new Date("2025-06-09T14:00:00"),
  },
  {
    content: "🌧️ 下雨天最适合窝在家里写代码。把博客的暗色模式调了几个小时，现在眼睛舒服多了。好的配色方案比任何护眼软件都重要。",
    images: [],
    isPublic: true,
    createdAt: new Date("2025-06-08T22:30:00"),
  },
  {
    content: "🏃 坚持跑步第 30 天！从 1 公里气喘吁吁到现在能轻松跑 5 公里。编程是脑力活，但没有体力支撑，专注力和创造力都会下降。",
    images: [],
    isPublic: true,
    createdAt: new Date("2025-06-07T07:00:00"),
  },
  {
    content: "💡 使用 GitHub Copilot 一个月的真实感受：\n\n优点：重复代码生成飞快，减少 Stack Overflow 查询，写正则和 SQL 特别好用\n缺点：有时生成的代码有隐藏 bug，需要仔细审查，过于依赖会降低手写代码的能力\n\n结论：当高级自动补全用就好，别当主力开发工具。",
    images: [],
    isPublic: true,
    createdAt: new Date("2025-06-05T18:00:00"),
  },
  {
    content: "🎧 编码时的 BGM 推荐：Lo-fi hip hop 和 ambient 类型最适合编程。今天在听坂本龙一的《async》，电子与古典的碰撞，节奏刚好适合思考。",
    images: ["/image/背景 (3).jpg"],
    isPublic: true,
    createdAt: new Date("2025-06-03T16:00:00"),
  },
];

/* ================================================================
 * 主逻辑
 * ================================================================ */

async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes("--clear");

  console.log("\n========== 示例数据填充 ==========\n");

  // 查找管理员
  const admin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!admin) {
    console.error(`❌ 管理员账号 ${ADMIN_EMAIL} 不存在！请先运行 seed-admin.ts`);
    process.exit(1);
  }

  console.log(`👤 管理员: ${admin.name} (${admin.email}) [${admin.role}]`);

  if (shouldClear) {
    console.log("\n🧹 清空现有数据...");
    await prisma.lifeLike.deleteMany();
    await prisma.postLike.deleteMany();
    await prisma.projectLike.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.tagOnPost.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.postChunk.deleteMany();
    await prisma.lifePost.deleteMany();
    await prisma.post.deleteMany();
    await prisma.project.deleteMany();
    console.log("  ✓ 已清空");
  }

  // ---- 博客文章 ----
  console.log("\n📝 创建博客文章...");
  for (const postData of POSTS) {
    const { tags, ...data } = postData;

    const existing = await prisma.post.findUnique({ where: { slug: data.slug } });
    if (existing) {
      console.log(`  ⏭ 跳过: ${data.title}（已存在）`);
      continue;
    }

    const post = await prisma.post.create({
      data: {
        ...data,
        authorId: admin.id,
      },
    });

    // 创建/关联标签
    for (const tagName of tags) {
      const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const tag = await prisma.tag.upsert({
        where: { slug: tagSlug },
        create: { name: tagName, slug: tagSlug },
        update: {},
      });
      await prisma.tagOnPost.create({
        data: { postId: post.id, tagId: tag.id },
      });
    }

    console.log(`  ✓ ${data.title} [${tags.join(", ")}]`);
  }

  // ---- 项目 ----
  console.log("\n🚀 创建项目...");
  for (const projData of PROJECTS) {
    const existing = await prisma.project.findUnique({
      where: { slug: projData.slug },
    });
    if (existing) {
      console.log(`  ⏭ 跳过: ${projData.title}（已存在）`);
      continue;
    }

    await prisma.project.create({
      data: {
        ...projData,
        authorId: admin.id,
      },
    });
    console.log(`  ✓ ${projData.title}`);
  }

  // ---- 生活分享 ----
  console.log("\n🌿 创建生活分享...");
  let lifeCount = 0;
  for (const lifeData of LIFE_POSTS) {
    await prisma.lifePost.create({
      data: {
        ...lifeData,
        authorId: admin.id,
      },
    });
    lifeCount++;
  }
  console.log(`  ✓ 已创建 ${lifeCount} 条生活分享`);

  // ---- 统计 ----
  const stats = {
    posts: await prisma.post.count(),
    projects: await prisma.project.count(),
    lifePosts: await prisma.lifePost.count(),
    tags: await prisma.tag.count(),
  };

  console.log("\n========== 完成 ==========");
  console.log(`  博客文章: ${stats.posts} 篇`);
  console.log(`  项目:     ${stats.projects} 个`);
  console.log(`  生活动态: ${stats.lifePosts} 条`);
  console.log(`  标签:     ${stats.tags} 个`);
  console.log("");
}

main()
  .catch((e) => {
    console.error("\n[SEED ERROR]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
