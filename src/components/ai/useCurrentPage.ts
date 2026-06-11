"use client";

import { useEffect, useState } from "react";

export type CurrentPageInfo = {
  /** 当前页面类型（用于决定 prompt 上下文） */
  type: "blog" | "life" | "project" | "home" | "other";
  /** 显示用的简短标题 */
  title: string;
  /** 完整 URL（用于 AI 知道用户在哪） */
  url: string;
};

/**
 * 探测当前页面的上下文信息
 *
 * 思路（无需改路由层，仅客户端解析）：
 *  1. URL path 决定 type（/blog/* → blog, /life/* → life, /projects/* → project）
 *  2. 标题优先取 DOM 上的 h1（页面级 <h1>），找不到就用 document.title
 *  3. 路由变化时（Next.js 客户端导航）通过 popstate 重新探测
 */
export function useCurrentPage(): CurrentPageInfo {
  const [info, setInfo] = useState<CurrentPageInfo>({
    type: "other",
    title: "",
    url: "",
  });

  useEffect(() => {
    const detect = () => {
      if (typeof window === "undefined") return;
      const url = window.location.pathname + window.location.search;
      const path = window.location.pathname;

      // 1) 推断 type
      let type: CurrentPageInfo["type"] = "other";
      if (path === "/" || path === "") type = "home";
      else if (path.startsWith("/blog")) type = "blog";
      else if (path.startsWith("/life")) type = "life";
      else if (path.startsWith("/projects")) type = "project";

      // 2) 探测标题
      //    - 优先取 h1（最准确）
      //    - 退一步取 og:title / twitter:title
      //    - 再退一步取 document.title（去掉 "| TechBlog Labs" 后缀）
      let title = "";
      const h1 = document.querySelector("h1");
      if (h1?.textContent) {
        title = h1.textContent.trim();
      } else {
        const og = document.querySelector('meta[property="og:title"]');
        const tw = document.querySelector('meta[name="twitter:title"]');
        title = (og as HTMLMetaElement)?.content || (tw as HTMLMetaElement)?.content || "";
      }
      if (!title) title = document.title;
      // 去掉品牌后缀
      title = title.replace(/\s*[|·•-]\s*TechBlog.*$/i, "").trim();
      // 截断
      if (title.length > 30) title = title.slice(0, 30) + "…";

      setInfo({ type, title, url });
    };

    detect();

    // 监听 Next.js 客户端导航（pushState/replaceState 不触发 popstate）
    // 用 MutationObserver 兜底：URL 变化时重新探测
    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    window.history.pushState = function (...args) {
      const r = origPush.apply(this, args as any);
      detect();
      return r;
    };
    window.history.replaceState = function (...args) {
      const r = origReplace.apply(this, args as any);
      detect();
      return r;
    };
    window.addEventListener("popstate", detect);

    return () => {
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
      window.removeEventListener("popstate", detect);
    };
  }, []);

  return info;
}
