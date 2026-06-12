import Link from 'next/link'
import { type BlogCardPost } from '@/components/blog/BlogCard'
import { getNumberConfig } from '@/lib/config'
import { WritingHero } from '@/components/shared/WritingSection'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { buildPostKeywordWhere, buildPostTitleWhere, safePage, tokenize } from '@/lib/search'
import { BlogSearchView } from '@/components/blog/BlogSearchView'
import type { SearchCategory } from '@/components/search/SearchBar'

// ============================================================
// 类型
// ============================================================

type TagInfo = {
  id: string
  name: string
  slug: string
  postCount: number
}

type BlogListData = {
  data: BlogCardPost[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

// ============================================================
// 数据获取（性能优化）
//   原实现：fetch('http://.../api/posts?status=PUBLISHED') 自调用
//   现实现：直接 prisma + unstable_cache(60s)，跳过一次 HTTP 往返
// ============================================================

async function getPosts(page: number, pageSize: number): Promise<BlogListData> {
  const fetcher = unstable_cache(
    async () => {
      const where = { status: 'PUBLISHED' as const, deletedAt: null }
      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            coverImage: true,
            status: true,
            featured: true,
            viewCount: true,
            likeCount: true,
            publishedAt: true,
            createdAt: true,
            author: { select: { id: true, name: true, image: true } },
            tags: {
              select: { tag: { select: { id: true, name: true, slug: true } } },
            },
          },
        }),
        prisma.post.count({ where }),
      ])
      const formatted = posts.map((post) => ({
        ...post,
        // Date → ISO 字符串（匹配 BlogCardPost 类型）
        createdAt: post.createdAt.toISOString(),
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
        tags: post.tags.map((t) => t.tag),
        highlight: null as { text: string; hit: boolean }[] | null,
      }))
      return { data: formatted, total }
    },
    ['posts-list', `p${page}`, `s${pageSize}`],
    { revalidate: 60, tags: ['posts'] },
  )

  const { data, total } = await fetcher()
  return {
    data,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  }
}

/**
 * searchPosts · 服务端搜索（与 /api/search/posts 等价但省去 HTTP 往返）
 *  - 组合 where：关键词全文 + 标签 + 标题
 *  - 返回带 highlight 片段的 BlogCardPost[]
 */
async function searchPosts(q: string | null, tag: string | null, title: string | null, page: number, pageSize: number): Promise<{ result: BlogListData; tookMs: number }> {
  const t0 = Date.now()
  const tokens = tokenize(q)
  const where = {
    status: 'PUBLISHED' as const,
    deletedAt: null,
    ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
    ...(title ? buildPostTitleWhere(title) : {}),
    ...(tokens.length > 0 ? buildPostKeywordWhere(tokens) : {}),
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        status: true,
        featured: true,
        viewCount: true,
        likeCount: true,
        publishedAt: true,
        createdAt: true,
        author: { select: { id: true, name: true, image: true } },
        tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
      },
    }),
    prisma.post.count({ where }),
  ])

  // 与 API 路由使用相同的 highlight 算法（保持一致）
  const data = posts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    tags: p.tags.map((t) => t.tag),
    highlight: buildHighlight(p.excerpt, p.title, tokens),
  }))

  return {
    result: {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    },
    tookMs: Date.now() - t0,
  }
}

async function getTags(): Promise<TagInfo[]> {
  const fetcher = unstable_cache(
    async () => {
      const tags = await prisma.tag.findMany({
        orderBy: { posts: { _count: 'desc' } },
        take: 20,
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { posts: { where: { post: { status: 'PUBLISHED' } } } } },
        },
      })
      return tags.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        postCount: t._count.posts,
      }))
    },
    ['tags-popular'],
    { revalidate: 300, tags: ['tags', 'posts'] },
  )
  return fetcher()
}

// ============================================================
// 页面组件
// ============================================================

/**
 * SEO metadata：列表页静态 title/description
 *  - 翻页时 template 由根 layout 拼成「第 N 页 | 博客 | Site」
 *  - 留 description/keywords 给搜索引擎
 */
export const metadata = {
  title: '博客',
  description: '技术博客、笔记与思考。Next.js / React / 全栈 / 工程实践。',
  keywords: ['技术博客', 'Next.js', 'React', '全栈', '工程实践'],
  openGraph: {
    title: '博客 · TechBlog Labs',
    description: '技术博客、笔记与思考。',
    type: 'website',
  },
}

export default async function BlogListPage({ searchParams }: { searchParams: { page?: string; q?: string; tag?: string; title?: string } }) {
  const page = safePage(searchParams.page ?? '1', 1)
  const pageSize = await getNumberConfig('posts_per_page', 9)
  const q = (searchParams.q ?? '').trim()
  const tag = (searchParams.tag ?? '').trim()
  const title = (searchParams.title ?? '').trim()
  const isSearch = q.length > 0 || tag.length > 0 || title.length > 0

  // 搜索时调 searchPosts；否则调 getPosts
  const [postsResult, tags] = await Promise.all([
    isSearch
      ? searchPosts(q || null, tag || null, title || null, page, pageSize)
      : getPosts(page, pageSize).then((r) => ({ result: r, tookMs: 0 })),
    getTags(),
  ])

  const data = isSearch
    ? { ...postsResult.result, tookMs: postsResult.tookMs }
    : { ...postsResult.result, tookMs: 0 }

  // 标签下拉分类
  const categories: SearchCategory[] = tags.map((t) => ({
    value: t.slug,
    label: t.name,
    count: t.postCount,
  }))

  return (
    <div className="mx-auto max-w-6xl px-5 md:px-10 lg:px-20 py-16">
      {/* 页面标题（从首页"最新文章"区块迁入） */}
      <WritingHero totalCount={data.pagination.total} />

      <div className="flex flex-col gap-12 lg:flex-row">
        {/* ============================================================ */}
        {/* 主内容 — 搜索栏 + 文章列表 */}
        {/* ============================================================ */}
        <div className="flex-1">
          <BlogSearchView posts={data.data} pagination={data.pagination} tags={categories} activeQuery={q} activeTag={tag} tookMs={data.tookMs} />
        </div>

        {/* ============================================================ */}
        {/* 侧边栏 — 热门标签 */}
        {/* ============================================================ */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="sticky top-24">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-foreground))]">热门标签</h3>
            {tags.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted-foreground))]">暂无标签</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link key={tag.id} href={`/tags/${tag.slug}`} className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-xs font-medium transition-all hover:border-amber hover:text-amber-bright hover:shadow-sm">
                    {tag.name}
                    <span className="text-[rgb(var(--muted-foreground))]">({tag.postCount})</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

// ============================================================
// 与 /api/search/posts 同步的 highlight 计算
// ============================================================
function buildHighlight(excerpt: string | null, title: string, tokens: string[]): { text: string; hit: boolean }[] | null {
  if (tokens.length === 0) return null
  const source = excerpt ?? title
  if (!source) return null
  const lc = source.toLowerCase()
  let firstIdx = -1
  for (const t of tokens) {
    const i = lc.indexOf(t.toLowerCase())
    if (i >= 0 && (firstIdx === -1 || i < firstIdx)) firstIdx = i
  }
  if (firstIdx === -1) {
    return [{ text: source.slice(0, 160), hit: false }]
  }
  const start = Math.max(0, firstIdx - 40)
  const end = Math.min(source.length, firstIdx + 80)
  const slice = (start > 0 ? '…' : '') + source.slice(start, end) + (end < source.length ? '…' : '')

  const fragments: { text: string; hit: boolean }[] = []
  const lcSlice = slice.toLowerCase()
  let cursor = 0
  while (cursor < slice.length) {
    let nextHit = -1
    let nextToken = ''
    for (const t of tokens) {
      const idx = lcSlice.indexOf(t.toLowerCase(), cursor)
      if (idx >= 0 && (nextHit === -1 || idx < nextHit)) {
        nextHit = idx
        nextToken = t
      }
    }
    if (nextHit === -1) {
      fragments.push({ text: slice.slice(cursor), hit: false })
      break
    }
    if (nextHit > cursor) fragments.push({ text: slice.slice(cursor, nextHit), hit: false })
    const hitEnd = nextHit + nextToken.length
    fragments.push({ text: slice.slice(nextHit, hitEnd), hit: true })
    cursor = hitEnd
  }
  return fragments
}
