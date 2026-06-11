"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

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

const MailIcon: IconComponent = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
  </svg>
);

const SOCIAL_LINKS = [
  { icon: GithubIcon, label: "GitHub", href: "#" },
  { icon: TwitterIcon, label: "X (Twitter)", href: "#" },
  { icon: MailIcon, label: "Email", href: "#" },
] as const;

export interface ContactBlockProps {
  className?: string;
  /**
   * 是否渲染为 section 容器（默认 true）。
   *  - true：在 /about 页面作为独立章节
   *  - false：仅返回内部内容，便于嵌套
   */
  asSection?: boolean;
}

/**
 * 共享「保持联系」区块
 *
 *  - 主标题「保持 联系」+ 暖色斜体
 *  - 引导文案
 *  - CTA 按钮组：留言 + 登录/注册
 *  - 社交链接
 *  - 版权信息
 */
export function ContactBlock({
  className = "",
  asSection = true,
}: ContactBlockProps) {
  const content = (
    <div className={`text-center ${className}`}>
      <p className="text-xs uppercase tracking-[0.3em] text-amber-bright/80 font-mono mb-4 flex items-center justify-center gap-3">
        <span className="inline-block w-8 h-px bg-amber-bright/60" />
        — Get in touch
        <span className="inline-block w-8 h-px bg-amber-bright/60" />
      </p>
      <h2 className="font-serif text-4xl md:text-6xl tracking-tight text-foreground leading-[1.1]">
        <span className="italic text-amber-bright">保持</span> 联系
      </h2>
      <p className="mt-6 text-muted-foreground text-base md:text-lg max-w-md mx-auto leading-relaxed">
        感谢你的来访，如果有什么想说的，欢迎留言
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link href="/blog" data-cursor="hover" className="btn-amber">
          给我留言
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/login" data-cursor="hover" className="btn-outline">
          登录 / 注册
        </Link>
      </div>
      <div className="mt-12 flex justify-center">
        <div className="flex items-center gap-5">
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
      </div>
      <p className="mt-16 text-xs text-muted-foreground/60 font-mono">
        © {new Date().getFullYear()} VitaLog · 生生不息 · 记录即呼吸
      </p>
    </div>
  );

  if (!asSection) return content;

  return (
    <section className="vitalog-section vitalog-section--final px-5 md:px-10 lg:px-20 py-24">
      {content}
    </section>
  );
}

export default ContactBlock;
