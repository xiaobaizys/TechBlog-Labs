"use client";

import { useEffect, useRef, useState } from "react";
import type { TocEntry } from "@/lib/mdx";

type TocSidebarProps = {
  toc: TocEntry[];
};

/**
 * 桌面端 TOC 侧边栏
 *
 * 滚动高亮策略：
 *   - 使用 IntersectionObserver 追踪所有标题的可见性
 *   - 在滚动回调中通过 getBoundingClientRect 精确判断
 *     当前"正在阅读"的标题：第一个 top >= 0（即刚好在视口顶部或以下）的标题
 *   - 如果滚动到页面底部且没有标题在视口顶部以下，则高亮最后一个标题
 */
export function TocSidebar({ toc }: TocSidebarProps) {
  const [activeId, setActiveId] = useState("");
  const headingElsRef = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    // 收集所有标题 DOM 元素
    const map = new Map<string, HTMLElement>();
    for (const { id } of toc) {
      const el = document.getElementById(id);
      if (el) map.set(id, el);
    }
    headingElsRef.current = map;

    // 滚动时精确计算当前活跃标题
    function updateActive() {
      let currentId = "";
      const scrollY = window.scrollY;
      const viewH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;

      // 页面底部：高亮最后一个标题
      if (scrollY + viewH >= docH - 100) {
        currentId = toc[toc.length - 1]?.id ?? "";
      } else {
        // 找到第一个 top 在视口顶部以下的标题（即当前正在阅读的段落）
        for (const { id } of toc) {
          const el = map.get(id);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          // 标题顶部在 100px 线以下 → 说明用户已经读过了上一个标题，当前在读这个
          if (rect.top >= 0 && rect.top <= viewH * 0.5) {
            currentId = id;
            break;
          }
        }
        // 如果所有标题都在视口顶部以上（用户回滚到最顶），高亮第一个
        if (!currentId && toc.length > 0) {
          const firstEl = map.get(toc[0].id);
          if (firstEl && firstEl.getBoundingClientRect().top > viewH * 0.5) {
            currentId = toc[0].id;
          } else {
            // 反向找最后一个 top <= 100 的标题（用户已滚过该标题）
            for (let i = toc.length - 1; i >= 0; i--) {
              const el = map.get(toc[i].id);
              if (el && el.getBoundingClientRect().top <= 100) {
                currentId = toc[i].id;
                break;
              }
            }
          }
        }
      }

      setActiveId((prev) => (prev !== currentId ? currentId : prev));
    }

    // 初始计算
    updateActive();

    // 监听滚动
    window.addEventListener("scroll", updateActive, { passive: true });
    return () => window.removeEventListener("scroll", updateActive);
  }, [toc]);

  function handleClick(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.scrollBy(0, -80);
      setActiveId(id);
    }
  }

  if (toc.length === 0) return null;

  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <nav className="sticky top-24">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted-foreground))]">
          目录
        </h4>
        <ul className="space-y-1 border-l-2 border-[rgb(var(--border))] pl-3">
          {toc.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleClick(item.id)}
                className={`block w-full py-1 text-left text-sm transition-all duration-200 hover:text-amber-bright ${
                  item.level === 3 ? "pl-3 text-xs" : ""
                } ${
                  activeId === item.id
                    ? "font-medium text-amber-bright -translate-x-px border-l-[2px] border-amber-bright -ml-[calc(0.75rem+2px)] pl-[calc(0.75rem+2px)]"
                    : "text-[rgb(var(--muted-foreground))]"
                }`}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
