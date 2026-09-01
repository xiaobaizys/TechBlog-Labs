"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X } from "lucide-react";

/* GitHub 简洁 SVG（lucide-react 没内置 Github，沿用自绘） */
function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.58 2 12.25c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49v-1.7c-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.9 1.56 2.35 1.11 2.92.85.09-.66.35-1.11.63-1.36-2.22-.26-4.55-1.13-4.55-5.04 0-1.11.39-2.02 1.03-2.74-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.74 0 3.92-2.33 4.78-4.56 5.03.36.32.68.94.68 1.9v2.81c0 .27.18.6.69.49A10.04 10.04 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  );
}

/* RSS 图标 */
function RssIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  );
}

/**
 * 站点页脚 SiteFooter（合规版）
 *
 *  四行居中：
 *   - 第一行：© {year} 生息日志 保留所有权利。· 隐私政策 · GitHub · RSS · 笑声文档工具箱
 *   - 第二行：ICP备案信息（工信部备案）
 *   - 第三行：公安网安备案信息（粤公网安备案）
 *   - 第四行：Powered by 逃之夭夭 & 哔哩哔哩
 *
 *  视觉：深色背景 + 顶部虚线分隔 + 居中文字，链接高亮色
 *  交互：点击「微信小程序」弹出二维码弹窗（用 <dialog> 语义）
 *  合规：满足工信部ICP备案+公安网安备案双合规排版要求
 */

/* ============================================================
 *  备案信息配置（已配置完成）
 * ============================================================ */
const GITHUB_URL = "https://github.com/xiaobaizys";
const WECHAT_QR = "/image/%E4%BA%8C%E7%BB%B4%E7%A0%81.jpg"; // 微信小程序二维码（已移入 public/image/）

// ICP备案配置 - 请替换为真实备案号
const ICP_BEIAN_NUMBER = "粤ICP备2026072693号-2"; // 替换为真实ICP备案号
const ICP_BEIAN_URL = "https://beian.miit.gov.cn/";

// 公安网安备案配置 - 请替换为真实备案号
const POLICE_BEIAN_NUMBER = "粤公网安备 44051302000288号"; // 替换为真实公安备案号
const POLICE_BEIAN_URL = "https://beian.mps.gov.cn/#/query/webSearch";

// 公安备案官方图标（PNG格式）
const POLICE_ICON_URL = "/icons/备案图标.png"; // 公安备案图标路径

export function SiteFooter() {
  const year = new Date().getFullYear();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openQr = (e: React.MouseEvent) => {
    e.preventDefault();
    dialogRef.current?.showModal();
  };
  const closeQr = () => dialogRef.current?.close();

  /* ESC / 点击遮罩关闭（dialog 自带 ESC，遮罩由 ::backdrop 触发） */
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onClick = (ev: MouseEvent) => {
      // 点击 ::backdrop 时 rect 为空，target 为 dialog 本身且 clientX/Y 在外
      if (ev.target === d) {
        const r = d.getBoundingClientRect();
        if (
          ev.clientX < r.left ||
          ev.clientX > r.right ||
          ev.clientY < r.top ||
          ev.clientY > r.bottom
        ) {
          d.close();
        }
      }
    };
    d.addEventListener("click", onClick);
    return () => d.removeEventListener("click", onClick);
  }, []);

  return (
    <footer className="vitalog-footer" aria-label="站点页脚">
      <div className="vitalog-footer__inner">
        {/* 第一行：版权信息和链接 */}
        <p className="vitalog-footer__line">
          <span>©2026 保留所有权利。</span>
          <span className="vitalog-footer__sep" aria-hidden>
            ·
          </span>
          <Link
            href="/privacy"
            className="vitalog-footer__link"
            data-cursor="hover"
          >
            隐私政策
          </Link>
          <span className="vitalog-footer__sep" aria-hidden>
            ·
          </span>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="vitalog-footer__link"
            data-cursor="hover"
          >
            <GithubIcon
              className="vitalog-footer__link-icon"
              aria-hidden
            />
            GitHub
          </a>
          <span className="vitalog-footer__sep" aria-hidden>
            ·
          </span>
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="vitalog-footer__link"
            data-cursor="hover"
            title="RSS 订阅"
          >
            <RssIcon
              className="vitalog-footer__link-icon"
              aria-hidden
            />
            RSS
          </a>
          <span className="vitalog-footer__sep" aria-hidden>
            ·
          </span>
          <a
            href={WECHAT_QR}
            onClick={openQr}
            className="vitalog-footer__link"
            data-cursor="hover"
          >
            笑声文档工具箱
          </a>
        </p>

        {/* 第二行：ICP工信部备案信息 */}
        <p className="vitalog-footer__line vitalog-footer__line--beian">
          <span>©2026 | ICP备案号：</span>
          <a
            href={ICP_BEIAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="vitalog-footer__link"
            data-cursor="hover"
            title="工信部ICP备案查询"
          >
            {ICP_BEIAN_NUMBER}
          </a>
        </p>

        {/* 第三行：公安网安备案信息 */}
        <p className="vitalog-footer__line vitalog-footer__line--beian">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={POLICE_ICON_URL}
            alt="公安备案图标"
            className="vitalog-footer__police-icon"
            width="16"
            height="16"
            aria-hidden
          />
          <a
            href={POLICE_BEIAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="vitalog-footer__link"
            data-cursor="hover"
            title="全国互联网安全管理服务平台"
          >
            {POLICE_BEIAN_NUMBER}
          </a>
        </p>
      </div>

      {/* 微信小程序二维码弹窗 */}
      <dialog
        ref={dialogRef}
        className="vitalog-footer__qr-dialog"
        aria-label="微信小程序二维码"
      >
        <div className="vitalog-footer__qr-card">
          <button
            type="button"
            className="vitalog-footer__qr-close"
            onClick={closeQr}
            aria-label="关闭"
            data-cursor="hover"
          >
            <X aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WECHAT_QR}
            alt="微信小程序二维码"
            className="vitalog-footer__qr-img"
          />
          <p className="vitalog-footer__qr-tip">
            微信扫一扫，进入小程序
          </p>
        </div>
      </dialog>
    </footer>
  );
}

export default SiteFooter;
