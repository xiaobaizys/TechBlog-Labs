import { revalidateTag } from "next/cache";

/**
 * 缓存 Tag 集中管理
 *
 *  - 所有 unstable_cache 使用的 tag 都集中在这里
 *  - 在写接口（admin mutate）里调用 revalidate* 即可精准失效缓存
 *  - 改一个 tag 名就改这一处，避免散落到各 route 写错名字
 */
export const CACHE_TAGS = {
  posts: "posts",
  postDetail: "post-detail",
  projects: "projects",
  projectDetail: "project-detail",
  techStacks: "tech-stacks",
  lifePosts: "life-posts",
  tags: "tags",
  stats: "stats",
} as const;

/**
 * 失效博客相关缓存
 *  - 列表（/blog, 首页博客区）
 *  - 文章详情
 *  - 标签侧栏
 *  - 统计数据
 */
export function revalidatePosts() {
  revalidateTag(CACHE_TAGS.posts);
  revalidateTag(CACHE_TAGS.postDetail);
  revalidateTag(CACHE_TAGS.tags);
  revalidateTag(CACHE_TAGS.stats);
}

/**
 * 失效项目相关缓存
 *  - 项目列表（/projects, 首页项目区）
 *  - 项目详情
 *  - 技术栈筛选
 */
export function revalidateProjects() {
  revalidateTag(CACHE_TAGS.projects);
  revalidateTag(CACHE_TAGS.projectDetail);
  revalidateTag(CACHE_TAGS.techStacks);
  revalidateTag(CACHE_TAGS.stats);
}

/**
 * 失效生活分享相关缓存
 *  - 列表（/life）
 */
export function revalidateLifePosts() {
  revalidateTag(CACHE_TAGS.lifePosts);
  revalidateTag(CACHE_TAGS.stats);
}
