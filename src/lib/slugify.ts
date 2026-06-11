import slugifyLib from "slugify";

/**
 * 生成 URL 友好的 slug
 *
 * @param text - 原始文本（通常是文章标题）
 * @returns 小写、仅含字母数字和连字符的 slug
 *
 * @example
 * slugify("Hello World! 你好")   // → "hello-world-你好"
 * slugify("Next.js 14 全栈指南")  // → "nextjs-14-全栈指南"
 */
export function slugify(text: string): string {
  return slugifyLib(text, {
    lower: true,          // 全小写
    strict: false,        // 保留中文等非 ASCII 字符
    trim: true,           // 去除首尾空格
    remove: /[*+~.()'"!:@]/g, // 移除特殊字符
  });
}

/**
 * 生成带随机后缀的唯一 slug
 *
 * 防止 slug 冲突，在末尾追加 6 位随机字符
 *
 * @example
 * uniqueSlug("Hello World") // → "hello-world-a1b2c3"
 */
export function uniqueSlug(text: string): string {
  const base = slugify(text);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}
