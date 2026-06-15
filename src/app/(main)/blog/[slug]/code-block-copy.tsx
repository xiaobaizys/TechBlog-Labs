"use client";

import { useEffect, useCallback } from "react";

/**
 * 代码块复制按钮
 *
 * 用法：在文章页面渲染后使用，自动为所有 <pre> 代码块添加复制按钮。
 * 直接写在 MDXContent 之后，由客户端水合时给已经渲染出来的 <pre> 加上按钮。
 */
export function CodeBlockCopy() {
  const attachButtons = useCallback(() => {
    const article = document.querySelector("article");
    if (!article) return;

    const pres = article.querySelectorAll<HTMLPreElement>(
      "pre:not([data-copy-attached])"
    );
    if (pres.length === 0) return;

    pres.forEach((pre) => {
      pre.dataset.copyAttached = "true";

      // 让 pre 成为相对定位容器
      if (!pre.style.position || pre.style.position === "static") {
        pre.style.position = "relative";
      }

      // 创建按钮
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "copy-code-btn";
      btn.setAttribute("aria-label", "复制代码");
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span class="copy-code-text">复制</span>`;

      btn.addEventListener("click", async () => {
        const code = pre.querySelector("code");
        const text = code?.textContent ?? pre.textContent ?? "";
        try {
          await navigator.clipboard.writeText(text);
          // 切换为已复制状态
          btn.classList.add("copied");
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span class="copy-code-text">已复制</span>`;
          setTimeout(() => {
            btn.classList.remove("copied");
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span class="copy-code-text">复制</span>`;
          }, 2000);
        } catch {
          // 降级方案
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
      });

      pre.appendChild(btn);
    });
  }, []);

  useEffect(() => {
    // 初次挂载
    attachButtons();

    // 观察 DOM 变化（应对动态加载的内容）
    const observer = new MutationObserver(() => {
      attachButtons();
    });

    const article = document.querySelector("article");
    if (article) {
      observer.observe(article, { childList: true, subtree: true });
    }

    return () => observer.disconnect();
  }, [attachButtons]);

  // 不渲染任何 DOM，纯 JS 注入
  return null;
}
