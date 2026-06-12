"use client";

import { Fragment } from "react";

/**
 * HighlightText · 把字符串按关键词命中切成片段并高亮
 *
 * 入参：
 *  - fragments：[{ text, hit }] —— 服务端 API 已经算好
 *               也可以传 null/undefined，自动 fallback 到纯文本
 *  - fallback：没有 fragments 时直接展示的字符串
 *  - className：外层 span
 *  - hitClassName：命中片段的额外 class
 */
export function HighlightText({
  fragments,
  fallback,
  className,
  hitClassName = "rounded bg-amber/25 px-0.5 text-amber-bright",
}: {
  fragments?: { text: string; hit: boolean }[] | null;
  fallback: string;
  className?: string;
  hitClassName?: string;
}) {
  if (!fragments || fragments.length === 0) {
    return <span className={className}>{fallback}</span>;
  }
  return (
    <span className={className}>
      {fragments.map((f, i) =>
        f.hit ? (
          <mark key={i} className={hitClassName}>
            {f.text}
          </mark>
        ) : (
          <Fragment key={i}>{f.text}</Fragment>
        )
      )}
    </span>
  );
}
