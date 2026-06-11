"use client";

import type { ComponentType } from "react";
import { Mail } from "lucide-react";

/* ============================================================
   内联 SVG 品牌图标
   ============================================================ */
type IconComponent = (props: { className?: string }) => JSX.Element;

const GithubIcon: IconComponent = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.69.08-.69 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.77.11 3.06.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55C20.21 21.38 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
  </svg>
);

const TwitterIcon: IconComponent = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
  </svg>
);

const SOCIAL_LINKS = [
  { icon: GithubIcon, label: "GitHub", href: "#" },
  { icon: TwitterIcon, label: "X (Twitter)", href: "#" },
  { icon: Mail, label: "Email", href: "#" },
] as const;

const SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "TailwindCSS",
  "Python",
  "Prisma",
] as const;

export interface AboutPanelProps {
  className?: string;
  /**
   * 是否展示标题块（默认 true）
   *  - 登录页 / 关于页：显示 "— About" 标题
   *  - 嵌入卡片时可关闭
   */
  showHeading?: boolean;
  /**
   * 是否展示社交链接
   */
  showSocial?: boolean;
}

/**
 * 共享 About 面板
 *
 *  - 头像（琥珀色 logo / SVG 太阳）
 *  - 个人介绍
 *  - 技能标签
 *  - 社交链接
 *
 * 用在：登录页侧栏、关于页、首页（已迁出）
 */
export function AboutPanel({
  className = "",
  showHeading = true,
  showSocial = true,
}: AboutPanelProps) {
  return (
    <div className={className}>
      {showHeading && (
        <div className="mb-10 text-left">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-bright/80 font-mono mb-3 flex items-center gap-3">
            <span className="inline-block w-8 h-px bg-amber-bright/60" />
            — About
          </p>
          <h2 className="text-2xl md:text-3xl font-serif font-medium tracking-tight text-foreground leading-[1.1]">
            一个热爱
            <span className="italic text-amber-bright"> 技术 </span>
            的人
          </h2>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-[120px_1fr] items-start">
        {/* 头像占位 — 太阳/星形 logo */}
        <div className="flex md:justify-start justify-center">
          <div className="relative w-[120px] h-[120px] rounded-full overflow-hidden border border-amber-bright/40 shadow-amber bg-gradient-to-br from-card to-muted flex items-center justify-center">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              className="h-16 w-16 text-amber"
              aria-hidden="true"
            >
              <circle cx="16" cy="16" r="4" fill="currentColor" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <line
                  key={deg}
                  x1="16"
                  y1="3"
                  x2="16"
                  y2="9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  transform={`rotate(${deg} 16 16)`}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* 内容 */}
        <div>
          <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
            一个热爱技术与创作的全栈开发者，相信代码不仅是工具，更是表达创意的语言。这里记录着技术思考、项目实践和生活碎片。
          </p>

          {/* 技能标签 */}
          <div className="mt-6 flex flex-wrap gap-2">
            {SKILLS.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 text-xs font-mono rounded-full border border-border bg-card/40 text-muted-foreground hover:text-amber hover:border-amber/50 transition-colors"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* 社交链接 */}
          {showSocial && (
            <div className="mt-6 flex items-center gap-5">
              {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  data-cursor="hover"
                  className="text-muted-foreground hover:text-amber transition-colors duration-300"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AboutPanel;
