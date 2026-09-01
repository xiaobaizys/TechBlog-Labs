"use client";

import { useState, useEffect } from "react";
import { BookOpen, X } from "lucide-react";

interface ReadingModeToggleProps {
  children: React.ReactNode;
}

export function ReadingModeToggle({ children }: ReadingModeToggleProps) {
  const [isReadingMode, setIsReadingMode] = useState(false);

  // 从 localStorage 读取偏好
  useEffect(() => {
    const saved = localStorage.getItem("readingMode");
    if (saved !== null) {
      setIsReadingMode(saved === "true");
    }
  }, []);

  // 保存偏好到 localStorage
  useEffect(() => {
    localStorage.setItem("readingMode", String(isReadingMode));
  }, [isReadingMode]);

  const toggleReadingMode = () => {
    setIsReadingMode((prev) => !prev);
  };

  return (
    <>
      {/* 阅读模式切换按钮 - 固定在右下角 */}
      <button
        onClick={toggleReadingMode}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-lg hover:border-amber hover:text-amber-bright transition-colors"
        title={isReadingMode ? "退出阅读模式" : "进入阅读模式"}
        aria-label={isReadingMode ? "退出阅读模式" : "进入阅读模式"}
      >
        {isReadingMode ? (
          <X className="h-5 w-5" />
        ) : (
          <BookOpen className="h-5 w-5" />
        )}
      </button>

      {/* 阅读模式下的样式覆盖 */}
      {isReadingMode && (
        <style jsx global>{`
          /* 隐藏导航栏 */
          header,
          nav,
          [role="navigation"],
          .top-header,
          .navbar {
            display: none !important;
          }

          /* 隐藏侧边栏 */
          .toc-sidebar,
          .mobile-toc-fab,
          aside {
            display: none !important;
          }

          /* 隐藏分享按钮 */
          .share-buttons,
          [class*="share"] {
            display: none !important;
          }

          /* 隐藏相关文章 */
          .related-posts,
          [class*="related"] {
            display: none !important;
          }

          /* 隐藏评论区 */
          .comment-section,
          [class*="comment"] {
            display: none !important;
          }

          /* 隐藏返回按钮和管理员按钮 */
          .mb-5.flex.items-center.justify-between {
            display: none !important;
          }

          /* 简化标签样式 */
          .mb-4.flex.flex-wrap.gap-2 {
            display: none !important;
          }

          /* 阅读模式背景 */
          body {
            background-color: #ffffff !important;
          }

          [data-theme="dark"] body,
          .dark body,
          body.dark {
            background-color: #0a0a0a !important;
          }

          /* 阅读模式主内容区域 */
          article {
            max-width: 3xl !important;
            margin-left: auto !important;
            margin-right: auto !important;
            padding-top: 3rem !important;
            padding-bottom: 3rem !important;
            padding-left: 1.5rem !important;
            padding-right: 1.5rem !important;
          }

          /* 阅读模式下隐藏外层容器的 padding */
          .mx-auto.max-w-5xl {
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            max-width: none !important;
          }

          /* 阅读模式下 flex 布局改为单列 */
          .flex.flex-col.lg\\:flex-row {
            flex-direction: column !important;
          }

          /* 阅读模式下封面图样式调整 */
          .relative.mb-10.aspect-\\[16\\/9\\] {
            margin-bottom: 2rem !important;
          }

          /* 阅读模式下隐藏底部工具栏 */
          .mt-12.flex.flex-col.sm\\:flex-row {
            display: none !important;
          }
        `}</style>
      )}

      {children}
    </>
  );
}
