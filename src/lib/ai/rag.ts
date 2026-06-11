import { prisma } from '@/lib/prisma'
import { keywordSearch, chunkText, callDeepSeek, streamDeepSeek } from './embeddings'

/**
 * RAG 系统提示词
 */
const SYSTEM_PROMPT = `你是 TechBlog Labs 的 AI 助手，基于博客文章内容回答用户问题。

规则：
1. 优先使用下面提供的文章片段来回答问题
2. 如果文章片段不足以回答，可以结合你的知识补充，但要说明
3. 保持友好、简洁的风格
4. 回答末尾可以推荐相关文章
5. 使用中文回答`

/**
 * 当前页面上下文（前端 useCurrentPage 探测）
 */
export type PageContext = {
  pageType?: string // "blog" | "life" | "project" | "home" | "other"
  pageTitle?: string
  pageUrl?: string
}

/**
 * 检索相关文章片段（fallback 模式，基于关键词匹配）
 *
 * 性能优化：
 *  - 之前一次性 `findMany` 把全库所有 PostChunk 拉到 Node 内存再做关键词匹配，
 *    文章多了会爆内存 / 慢。
 *  - 现在改为在 SQL 里先用 ILIKE 过滤出「至少包含 1 个查询词」的候选集
 *    （topK * 5 倍上限，避免空匹配时拿空），再在 Node 里打分排序。
 *  - 真实生产环境推荐上 pgvector / tsvector，本项目用 ILIKE 是低风险替代。
 */
export async function retrieveRelevantChunks(query: string, topK: number = 3): Promise<{ content: string; postTitle: string; postSlug: string }[]> {
  // 提取查询词（与 keywordSearch 保持一致：>1 字符的 token）
  const terms = Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, ''))
        .filter((t) => t.length > 1),
    ),
  )

  // 没有任何有效查询词 → 返回空，让 AI 自由发挥
  if (terms.length === 0) return []

  // 1) SQL 侧先用 ILIKE 过滤（避免全表传输）
  //    用 OR 连接多个 term，任一命中即可进入候选集
  //    注意：Prisma 的 OR 不能放进 StringFilter 内，必须提升到 where 顶层
  const candidateLimit = Math.max(50, topK * 10)
  const candidates = await prisma.postChunk.findMany({
    where: {
      post: { status: 'PUBLISHED', deletedAt: null },
      OR: terms.map((t) => ({
        content: { contains: t, mode: 'insensitive' as const },
      })),
    },
    include: {
      post: { select: { title: true, slug: true } },
    },
    take: candidateLimit,
  })

  if (candidates.length === 0) return []

  // 2) 在候选集上跑打分（原来 keywordSearch 行为不变）
  const results = keywordSearch(
    query,
    candidates.map((c) => c.content),
    topK,
  )

  return results.map((r) => ({
    content: r.content,
    postTitle: candidates[r.index].post.title,
    postSlug: candidates[r.index].post.slug,
  }))
}

/**
 * 构建 RAG Prompt
 *
 * 如果提供了 pageContext，会在 system prompt 里补充「用户在看哪一页」，
 * 让 AI 能给出更贴合当前页面的回答（比如"这篇文章讲了什么"）。
 */
export function buildRAGPrompt(question: string, contexts: { content: string; postTitle: string; postSlug: string }[], pageContext?: PageContext): { role: string; content: string }[] {
  const contextText = contexts.map((c, i) => `[文章${i + 1}] 《${c.postTitle}》\n内容片段: ${c.content.slice(0, 1500)}`).join('\n\n')

  // 如果前端告诉了我们当前页面，把它注入到 system prompt 里
  let system = SYSTEM_PROMPT
  if (pageContext?.pageType === 'blog' && pageContext.pageTitle) {
    system += `\n\n补充上下文：用户当前正在浏览文章《${pageContext.pageTitle}》（${pageContext.pageUrl || ''}）。如果用户的提问与"当前页"有关，优先基于这篇文章的内容回答。`
  } else if (pageContext?.pageType && pageContext.pageType !== 'other') {
    system += `\n\n补充上下文：用户当前在【${pageContext.pageType}】页面${pageContext.pageTitle ? `（${pageContext.pageTitle}）` : ''}。`
  }

  const userPrompt = contexts.length > 0 ? `参考文章:\n${contextText}\n\n用户问题: ${question}\n\n请根据参考文章回答问题。` : `用户问题: ${question}\n\n(没有找到相关文章，请根据你的知识回答)`

  return [
    { role: 'system', content: system },
    { role: 'user', content: userPrompt },
  ]
}

/**
 * RAG 问答 — 非流式
 */
export async function ragQuery(question: string, pageContext?: PageContext): Promise<{ answer: string; sources: { title: string; slug: string }[] }> {
  const contexts = await retrieveRelevantChunks(question)
  const messages = buildRAGPrompt(question, contexts, pageContext)
  const answer = await callDeepSeek(messages)

  return {
    answer,
    sources: contexts.map((c) => ({ title: c.postTitle, slug: c.postSlug })),
  }
}

/**
 * RAG 问答 — 流式
 */
export async function* ragQueryStream(question: string, pageContext?: PageContext): AsyncGenerator<{ type: 'token' | 'sources'; content: string }> {
  const contexts = await retrieveRelevantChunks(question)

  // 先输出来源信息
  if (contexts.length > 0) {
    yield {
      type: 'sources',
      content: JSON.stringify(contexts.map((c) => ({ title: c.postTitle, slug: c.postSlug }))),
    }
  }

  const messages = buildRAGPrompt(question, contexts, pageContext)

  for await (const token of streamDeepSeek(messages)) {
    yield { type: 'token', content: token }
  }
}

/**
 * 检查文章是否需要重新索引
 */
export async function getUnindexedPosts(): Promise<{ id: string; title: string; content: string }[]> {
  const posts = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      deletedAt: null,
      chunks: { none: {} },
    },
    select: { id: true, title: true, content: true },
  })
  return posts
}

/**
 * 将文章切分并存入 PostChunk
 */
export async function indexPost(postId: string): Promise<number> {
  // 删除旧切片
  await prisma.postChunk.deleteMany({ where: { postId } })

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { content: true, title: true },
  })

  if (!post) return 0

  const chunks = chunkText(post.content, 800)

  let index = 0
  for (const chunk of chunks) {
    await prisma.postChunk.create({
      data: {
        postId,
        chunkIndex: index,
        content: chunk,
      },
    })
    index++
  }

  return chunks.length
}
