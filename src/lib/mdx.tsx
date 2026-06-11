import { MDXRemote, type MDXRemoteProps } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import Image from "next/image";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

// ============================================================
// 自定义 MDX 组件
// ============================================================

/** 自定义 img → next/image */
function MDXImage(props: ComponentPropsWithoutRef<"img">) {
  const { src, alt, width, height } = props;
  if (!src) return null;

  const w = typeof width === "number" ? width : 800;
  const h = typeof height === "number" ? height : 450;

  // 外部图片直接用 img
  if (src.startsWith("http")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        className="rounded-lg border border-[rgb(var(--border))] my-8 w-full"
        loading="lazy"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt ?? ""}
      width={w}
      height={h}
      className="rounded-lg border border-[rgb(var(--border))] my-8"
      sizes="(max-width: 768px) 100vw, 768px"
    />
  );
}

/** 自定义 a → 外部链接新窗口打开 */
function MDXLink(props: ComponentPropsWithoutRef<"a">) {
  const { href, children, ...rest } = props;
  const isExternal = href?.startsWith("http") ?? false;

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-bright underline underline-offset-2 hover:text-amber"
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href ?? "#"}
      className="text-amber-bright underline underline-offset-2 hover:text-amber"
      {...(rest as any)}
    >
      {children}
    </Link>
  );
}

/** 自定义 pre → 代码块容器 */
function MDXPre(props: ComponentPropsWithoutRef<"pre">) {
  return (
    <pre
      className="my-6 overflow-x-auto rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-4 text-sm leading-relaxed"
      {...props}
    />
  );
}

/** 自定义 code → 行内代码 */
function MDXCode(props: ComponentPropsWithoutRef<"code">) {
  return (
    <code
      className="relative rounded bg-[rgb(var(--muted))] px-[0.3rem] py-[0.15rem] font-mono text-sm font-medium"
      {...props}
    />
  );
}

// ============================================================
// MDX 组件映射
// ============================================================

const MDX_COMPONENTS = {
  img: MDXImage,
  a: MDXLink,
  pre: MDXPre,
  code: MDXCode,
  // h1-h6 由 rehypeSlug 自动添加 id，在 globals.css 中定义样式
};

// ============================================================
// MDX 渲染配置
// ============================================================

const MDX_OPTIONS: MDXRemoteProps["options"] = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, rehypeHighlight],
    format: "mdx",
  },
  parseFrontmatter: false,
};

// ============================================================
// MDX 内容渲染组件
// ============================================================

type MDXContentProps = {
  /** MDX/Markdown 源码 */
  source: string;
};

/**
 * MDX 渲染组件（服务端组件）
 *
 * 用法：
 * ```tsx
 * import { MDXContent } from "@/lib/mdx";
 * export default function PostPage({ post }) {
 *   return <MDXContent source={post.content} />;
 * }
 * ```
 */
export async function MDXContent({ source }: MDXContentProps) {
  return (
    <div className="prose-custom">
      <MDXRemote
        source={source}
        components={MDX_COMPONENTS}
        options={MDX_OPTIONS}
      />
    </div>
  );
}

// ============================================================
// 从 MDX 内容提取标题（用于 TOC）
// ============================================================

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

/**
 * 从 Markdown/MDX 文本中提取所有标题
 */
export function extractToc(content: string): TocEntry[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const toc: TocEntry[] = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/<[^>]*>/g, "")
      .replace(/[^\w一-鿿]+/g, "-")
      .replace(/(^-|-$)/g, "");

    toc.push({ id, text, level });
  }

  return toc;
}

export { MDX_COMPONENTS, MDX_OPTIONS };
