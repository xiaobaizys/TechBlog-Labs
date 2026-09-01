"use client";

import { useState, useRef, useCallback } from "react";
import { Loader2, Image as ImageIcon } from "lucide-react";
import QRCode from "qrcode";

interface PosterGeneratorProps {
  title: string;
  author: string;
  authorImage?: string | null;
  date: string;
  excerpt?: string | null;
  content?: string;
  tags?: Array<{ id: string; name: string }>;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  slug: string;
  siteName?: string;
  siteUrl?: string;
}

/**
 * 文章海报生成器组件（升级版）
 *
 * 功能：
 * - 使用 Canvas 绘制 1200x630 的海报图片
 * - 深色渐变背景，暖橙色文字
 * - 包含：标签、文章标题、摘要、作者信息、统计数据、二维码
 * - 支持下载为 PNG 图片
 */
export function PosterGenerator({
  title,
  author,
  authorImage,
  date,
  excerpt,
  content,
  tags = [],
  viewCount = 0,
  likeCount = 0,
  commentCount = 0,
  slug,
  siteName = "生息日志 / VitaLog",
  siteUrl = "https://vitalog.dev",
}: PosterGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * 预加载字体
   */
  const loadFonts = async () => {
    try {
      await document.fonts.load('600 48px "Inter", "Space Grotesk", sans-serif');
      await document.fonts.load('700 48px "Inter", "Space Grotesk", sans-serif');
      await document.fonts.load('400 16px "Inter", "Space Grotesk", sans-serif');
      await document.fonts.load('500 16px "Inter", "Space Grotesk", sans-serif');
    } catch (error) {
      console.warn("字体加载失败，使用默认字体:", error);
    }
  };

  /**
   * 绘制圆角矩形
   */
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fillColor?: string
  ) => {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
  };

  /**
   * 绘制海报
   */
  const drawPoster = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 预加载字体
    await loadFonts();

    // 设置 canvas 尺寸
    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    // 绘制深色渐变背景
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, "#0c0c0e");
    bgGradient.addColorStop(1, "#1a1a1f");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 添加微弱光晕效果
    const glowGradient = ctx.createRadialGradient(
      width * 0.3,
      height * 0.2,
      0,
      width * 0.3,
      height * 0.2,
      width * 0.5
    );
    glowGradient.addColorStop(0, "rgba(255, 184, 108, 0.08)");
    glowGradient.addColorStop(1, "transparent");
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, width, height);

    // 绘制极细边框
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    // 绘制内部边框
    ctx.strokeStyle = "rgba(255, 184, 108, 0.15)";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(32, 32, width - 64, height - 64);

    // 绘制标签（如果有）
    let tagY = 80;
    if (tags.length > 0) {
      const tagPadding = 10;
      const tagGap = 12;
      const tagHeight = 28;
      let tagX = width / 2;

      // 计算标签总宽度
      ctx.font = '500 13px "Inter", "Space Grotesk", sans-serif';
      const displayTags = tags.slice(0, 4);
      let totalTagWidth = 0;
      displayTags.forEach((tag) => {
        totalTagWidth += ctx.measureText(tag.name).width + tagPadding * 2 + tagGap;
      });
      totalTagWidth -= tagGap;

      tagX = (width - totalTagWidth) / 2;

      displayTags.forEach((tag) => {
        const tagWidth = ctx.measureText(tag.name).width + tagPadding * 2;

        // 绘制标签背景
        drawRoundedRect(ctx, tagX, tagY, tagWidth, tagHeight, 14, "rgba(255, 184, 108, 0.2)");

        // 绘制标签边框
        ctx.strokeStyle = "rgba(255, 184, 108, 0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // 绘制标签文字
        ctx.fillStyle = "#FFB86C";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tag.name, tagX + tagWidth / 2, tagY + tagHeight / 2);

        tagX += tagWidth + tagGap;
      });

      tagY += tagHeight + 20;
    }

    // 绘制文章标题
    ctx.fillStyle = "#ffffff";
    ctx.font = '700 52px "Inter", "Space Grotesk", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.letterSpacing = "-0.02em";

    const maxWidth = width - 160;
    const words = title.split("");
    let line = "";
    let titleY = tagY + 20;
    const lineHeight = 62;
    let lineCount = 0;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, width / 2, titleY);
        line = words[i];
        titleY += lineHeight;
        lineCount++;

        // 最多显示 3 行
        if (lineCount >= 2) {
          line = line.slice(0, -3) + "...";
          ctx.fillText(line, width / 2, titleY);
          titleY += lineHeight;
          break;
        }
      } else {
        line = testLine;
      }
    }

    if (lineCount < 3) {
      ctx.fillText(line, width / 2, titleY);
      titleY += lineHeight;
    }

    // 绘制装饰分隔线
    const separatorY = titleY + 15;
    const separatorWidth = 80;
    const separatorGradient = ctx.createLinearGradient(
      width / 2 - separatorWidth / 2,
      0,
      width / 2 + separatorWidth / 2,
      0
    );
    separatorGradient.addColorStop(0, "transparent");
    separatorGradient.addColorStop(0.5, "#FFB86C");
    separatorGradient.addColorStop(1, "transparent");
    ctx.strokeStyle = separatorGradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - separatorWidth / 2, separatorY);
    ctx.lineTo(width / 2 + separatorWidth / 2, separatorY);
    ctx.stroke();

    // 绘制文章摘要
    const summaryText = excerpt || (content ? content.slice(0, 100) + "..." : "");
    if (summaryText) {
      ctx.fillStyle = "#a0a0a8";
      ctx.font = '400 18px "Inter", "Space Grotesk", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      const summaryY = separatorY + 20;
      const summaryMaxWidth = width - 200;

      // 摘要自动换行
      const summaryWords = summaryText.split("");
      let summaryLine = "";
      let currentSummaryY = summaryY;
      let summaryLineCount = 0;

      for (let i = 0; i < summaryWords.length; i++) {
        const testLine = summaryLine + summaryWords[i];
        const metrics = ctx.measureText(testLine);

        if (metrics.width > summaryMaxWidth && i > 0) {
          ctx.fillText(summaryLine, width / 2, currentSummaryY);
          summaryLine = summaryWords[i];
          currentSummaryY += 28;
          summaryLineCount++;

          // 最多显示 2 行
          if (summaryLineCount >= 1) {
            summaryLine = summaryLine.slice(0, -3) + "...";
            ctx.fillText(summaryLine, width / 2, currentSummaryY);
            currentSummaryY += 28;
            break;
          }
        } else {
          summaryLine = testLine;
        }
      }

      if (summaryLineCount < 2) {
        ctx.fillText(summaryLine, width / 2, currentSummaryY);
        currentSummaryY += 28;
      }
    }

    // 绘制作者信息区域
    const authorAreaY = height - 180;
    const avatarSize = 48;
    const avatarX = width / 2 - 120;
    const avatarY = authorAreaY;

    // 绘制作者头像（圆形）
    if (authorImage) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = authorImage;
        });

        ctx.save();
        ctx.beginPath();
        ctx.arc(
          avatarX + avatarSize / 2,
          avatarY + avatarSize / 2,
          avatarSize / 2,
          0,
          Math.PI * 2
        );
        ctx.clip();
        ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // 头像边框
        ctx.strokeStyle = "rgba(255, 184, 108, 0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          avatarX + avatarSize / 2,
          avatarY + avatarSize / 2,
          avatarSize / 2,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      } catch {
        // 头像加载失败，绘制默认头像
        drawDefaultAvatar(ctx, avatarX, avatarY, avatarSize);
      }
    } else {
      drawDefaultAvatar(ctx, avatarX, avatarY, avatarSize);
    }

    // 绘制作者名
    ctx.fillStyle = "#ffffff";
    ctx.font = '600 16px "Inter", "Space Grotesk", sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(author, avatarX + avatarSize + 16, avatarY + 4);

    // 绘制日期
    ctx.fillStyle = "#a0a0a8";
    ctx.font = '400 13px "Inter", "Space Grotesk", sans-serif';
    ctx.fillText(date, avatarX + avatarSize + 16, avatarY + 26);

    // 绘制统计数据
    const statsText = `阅读 ${viewCount.toLocaleString()} · 点赞 ${likeCount.toLocaleString()} · 评论 ${commentCount.toLocaleString()}`;
    ctx.fillStyle = "#808088";
    ctx.font = '400 12px "Inter", "Space Grotesk", sans-serif';
    ctx.fillText(statsText, avatarX + avatarSize + 16, avatarY + 46);

    // 绘制底部品牌区
    const brandAreaY = height - 60;

    // 品牌区背景
    const brandGradient = ctx.createLinearGradient(0, brandAreaY - 10, 0, height);
    brandGradient.addColorStop(0, "transparent");
    brandGradient.addColorStop(1, "rgba(0, 0, 0, 0.3)");
    ctx.fillStyle = brandGradient;
    ctx.fillRect(40, brandAreaY - 10, width - 80, 50);

    // 品牌分隔线
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(40, brandAreaY - 10);
    ctx.lineTo(width - 40, brandAreaY - 10);
    ctx.stroke();

    // 绘制品牌名
    ctx.fillStyle = "#FFB86C";
    ctx.font = '600 14px "Inter", "Space Grotesk", sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(siteName, 60, brandAreaY + 15);

    // 绘制域名
    ctx.fillStyle = "#808088";
    ctx.font = '400 12px "Inter", "Space Grotesk", sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(`🔗 ${siteUrl}`, width - 140, brandAreaY + 5);

    // 绘制二维码
    const qrSize = 80;
    const qrX = width - 120;
    const qrY = brandAreaY - 35;

    try {
      const qrCanvas = document.createElement("canvas");
      await QRCode.toCanvas(qrCanvas, `${siteUrl}/blog/${slug}`, {
        width: qrSize,
        margin: 1,
        color: {
          dark: "#FFB86C",
          light: "#00000000",
        },
      });

      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // 二维码边框
      ctx.strokeStyle = "rgba(255, 184, 108, 0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(qrX, qrY, qrSize, qrSize);
    } catch (error) {
      console.error("二维码生成失败:", error);
    }

    // 重置 letterSpacing
    ctx.letterSpacing = "normal";

    return canvas;
  }, [title, author, authorImage, date, excerpt, content, tags, viewCount, likeCount, commentCount, slug, siteName, siteUrl]);

  /**
   * 绘制默认头像
   */
  const drawDefaultAvatar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ) => {
    // 背景
    ctx.fillStyle = "rgba(255, 184, 108, 0.2)";
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // 用户图标
    ctx.fillStyle = "#FFB86C";
    ctx.font = `500 ${size / 2}px "Inter", "Space Grotesk", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(author[0] || "用", x + size / 2, y + size / 2);

    // 边框
    ctx.strokeStyle = "rgba(255, 184, 108, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.stroke();
  };

  /**
   * 生成并下载海报
   */
  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      const canvas = await drawPoster();
      if (!canvas) return;

      // 转换为图片并下载
      const link = document.createElement("a");
      link.download = `${slug}-poster.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("生成海报失败:", error);
      alert("生成海报失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* 隐藏的 Canvas */}
      <canvas
        ref={canvasRef}
        className="hidden"
        style={{ display: "none" }}
      />

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-sm font-medium text-[rgb(var(--muted-foreground))] transition-all hover:border-amber hover:bg-amber/10 hover:text-amber-bright disabled:opacity-50"
        title="生成文章海报"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
        {isGenerating ? "生成中..." : "生成海报"}
      </button>
    </>
  );
}
