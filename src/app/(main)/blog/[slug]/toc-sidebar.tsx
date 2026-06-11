"use client";

import { useEffect, useState } from "react";
import type { TocEntry } from "@/lib/mdx";

type TocSidebarProps = {
  toc: TocEntry[];
};

export function TocSidebar({ toc }: TocSidebarProps) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );

    for (const { id } of toc) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [toc]);

  function handleClick(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // 偏移以补偿 sticky header
      window.scrollBy(0, -80);
    }
  }

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
                className={`block w-full py-1 text-left text-sm transition-colors hover:text-amber-bright ${
                  item.level === 3 ? "pl-3 text-xs" : ""
                } ${
                  activeId === item.id
                    ? "font-medium text-amber-bright"
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
