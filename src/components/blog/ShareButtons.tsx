"use client";

import { useState } from "react";
import { Share2, Copy, Check, X as XIcon, MessageCircle } from "lucide-react";

interface ShareButtonsProps {
  title: string;
  url: string;
}

export function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级方案
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(title);
    const shareUrl = encodeURIComponent(url);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${shareUrl}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const shareToWeibo = () => {
    const text = encodeURIComponent(title);
    const shareUrl = encodeURIComponent(url);
    window.open(
      `https://service.weibo.com/share/share.php?title=${text}&url=${shareUrl}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const shareToWechat = async () => {
    // 生成微信二维码
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    window.open(qrUrl, "_blank", "width=250,height=250");
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[rgb(var(--muted-foreground))]">
        <Share2 className="inline h-4 w-4 mr-1" />
        分享
      </span>

      {/* 复制链接 */}
      <button
        onClick={copyToClipboard}
        className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2 text-[rgb(var(--muted-foreground))] hover:border-amber hover:text-amber-bright transition-colors"
        title="复制链接"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </button>

      {/* Twitter/X */}
      <button
        onClick={shareToTwitter}
        className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2 text-[rgb(var(--muted-foreground))] hover:border-[#1DA1F2] hover:text-[#1DA1F2] transition-colors"
        title="分享到 Twitter"
      >
        <XIcon className="h-4 w-4" />
      </button>

      {/* 微博 */}
      <button
        onClick={shareToWeibo}
        className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2 text-[rgb(var(--muted-foreground))] hover:border-[#E6162D] hover:text-[#E6162D] transition-colors"
        title="分享到微博"
      >
        <MessageCircle className="h-4 w-4" />
      </button>

      {/* 微信 */}
      <button
        onClick={shareToWechat}
        className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2 text-[rgb(var(--muted-foreground))] hover:border-[#07C160] hover:text-[#07C160] transition-colors"
        title="分享到微信（生成二维码）"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.11.24-.245 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zm-2.18 2.769c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z" />
        </svg>
      </button>
    </div>
  );
}
