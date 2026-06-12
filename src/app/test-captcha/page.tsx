"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  generateChallenge,
  PIECE_SIZE,
} from "@/lib/captcha/generator";

// ============================================================
// 类型
// ============================================================

type ChallengeData = {
  bgUrl: string;
  sliderUrl: string;
  targetX: number;
  targetY: number;
  pieceSize: number;
  bgWidth: number;
  bgHeight: number;
};

// ============================================================
// 常量
// ============================================================

const HANDLE_W = 18;
const HANDLE_H = 32;
const TOLERANCE_PX = 5; // 与服务端一致
const SNAP_RADIUS = 15; // 吸附半径（px）

// ============================================================
// SVG → 浏览器兼容的 data URL
// ============================================================

function svgToDataUrlClient(svg: string): string {
  // 使用 encodeURIComponent 方案，兼容浏览器环境
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ============================================================
// 主组件
// ============================================================

export default function TestCaptchaPage() {
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [thumbX, setThumbX] = useState(0);
  const [status, setStatus] = useState<"idle" | "dragging" | "success" | "fail">("idle");
  const trackElRef = useRef<HTMLDivElement>(null);
  const thumbXRef = useRef(0);

  // 生成新挑战
  const generate = useCallback(() => {
    const { backgroundSvg, sliderSvg, piece } = generateChallenge(320, 180);
    setChallenge({
      bgUrl: svgToDataUrlClient(backgroundSvg),
      sliderUrl: svgToDataUrlClient(sliderSvg),
      targetX: piece.x,
      targetY: piece.y,
      pieceSize: piece.size,
      bgWidth: 320,
      bgHeight: 180,
    });
    setThumbX(0);
    thumbXRef.current = 0;
    setStatus("idle");
  }, []);

  useEffect(() => {
    generate();
  }, [generate]);

  // ---- 拖拽逻辑 ----
  const updateThumb = (clientX: number) => {
    if (!challenge || !trackElRef.current) return;
    const rect = trackElRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const minX = challenge.pieceSize / 2;
    const maxX = challenge.bgWidth - challenge.pieceSize / 2;
    const clamped = Math.max(minX, Math.min(maxX, x));
    setThumbX(clamped);
    thumbXRef.current = clamped;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (status !== "idle" || !challenge) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateThumb(e.clientX);
    setStatus("dragging");
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (status !== "dragging") return;
    e.preventDefault();
    updateThumb(e.clientX);
  };

  const onPointerUp = async (e: React.PointerEvent) => {
    if (status !== "dragging" || !challenge) return;
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }

    // ---- 吸附：松手时若拇指在目标附近，自动吸附到精确位置 ----
    const dx = Math.abs(thumbXRef.current - challenge.targetX);
    if (dx > TOLERANCE_PX && dx <= SNAP_RADIUS) {
      setThumbX(challenge.targetX);
      thumbXRef.current = challenge.targetX;
      await new Promise((r) => setTimeout(r, 120));
    }

    // 检查对齐：|thumbX - targetX| ≤ TOLERANCE_PX
    const finalDx = Math.abs(thumbXRef.current - challenge.targetX);
    if (finalDx <= TOLERANCE_PX) {
      setStatus("success");
    } else {
      setStatus("fail");
      // 1.5 秒后重置
      setTimeout(() => {
        setThumbX(0);
        thumbXRef.current = 0;
        setStatus("idle");
      }, 1500);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-800 p-5 shadow-2xl">
        {/* 标题 */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-medium text-white">
            拼图滑块验证 · 本地测试
          </h3>
          <button
            type="button"
            onClick={generate}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-400"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            刷新
          </button>
        </div>

        {/* ============ 图片区 ============ */}
        <div
          className="relative overflow-hidden rounded-xl border border-gray-700 bg-gray-900"
          style={{
            width: challenge?.bgWidth ?? 320,
            height: challenge?.bgHeight ?? 180,
            margin: "0 auto",
          }}
        >
          {/* 背景图（含 SVG mask 切出的拼图缺口） */}
          {challenge && (
            <img
              src={challenge.bgUrl}
              alt="background"
              draggable={false}
              className="block h-full w-full"
            />
          )}

          {/* 叠加的可拖动拼图块（方块对齐方块） */}
          {challenge && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: thumbX - PIECE_SIZE / 2,
                top: challenge.targetY - PIECE_SIZE / 2,
                width: PIECE_SIZE,
                height: PIECE_SIZE,
                zIndex: 10,
                filter:
                  status === "success"
                    ? "drop-shadow(0 0 8px rgba(16,185,129,0.7))"
                    : status === "fail"
                    ? "drop-shadow(0 0 8px rgba(239,68,68,0.7))"
                    : "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
                transition: "filter 0.2s ease",
              }}
            >
              <img
                src={challenge.sliderUrl}
                alt="puzzle piece"
                draggable={false}
                className="block h-full w-full"
                style={{ opacity: status === "success" ? 1 : 0.85 }}
              />
            </div>
          )}

          {/* 成功 overlay */}
          {status === "success" && (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/15 backdrop-blur-[1px]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* ============ 滑轨 ============ */}
        {challenge && (
          <div className="mt-4" style={{ width: challenge.bgWidth, margin: "16px auto 0" }}>
            <div
              ref={trackElRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={`relative h-12 rounded-full border border-gray-600 bg-gray-700/50 touch-none ${
                status === "idle" ? "cursor-grab" : "cursor-grabbing"
              }`}
            >
              {/* 已完成段 */}
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-colors ${
                  status === "success"
                    ? "bg-emerald-500/30"
                    : status === "fail"
                    ? "bg-red-500/30"
                    : "bg-amber/30"
                }`}
                style={{ width: thumbX }}
              />

              {/* 拼图块 thumb */}
              <img
                src={challenge.sliderUrl}
                alt="slider"
                draggable={false}
                className={`absolute top-1/2 -translate-y-1/2 block ${
                  status === "idle" ? "opacity-100" : "opacity-60"
                }`}
                style={{
                  left: thumbX - PIECE_SIZE / 2,
                  width: PIECE_SIZE,
                  height: PIECE_SIZE,
                  pointerEvents: "none",
                }}
              />

              {/* 把手 */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center rounded-md border transition-opacity ${
                  status === "idle" ? "opacity-100" : "opacity-60"
                } ${status === "success" ? "bg-emerald-50 border-emerald-400" : status === "fail" ? "bg-red-50 border-red-400" : "bg-white/90 border-amber/60"}`}
                style={{
                  left: thumbX + PIECE_SIZE / 2,
                  width: HANDLE_W,
                  height: HANDLE_H,
                  pointerEvents: "none",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </div>

              {/* 提示文字 */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                {status === "idle" && "向右滑动使方块对齐缺口"}
                {status === "dragging" && "松手验证…"}
                {status === "success" && "对齐成功 ✓"}
                {status === "fail" && "位置不对，请重试"}
              </div>
            </div>
          </div>
        )}

        {/* 目标位置调试信息 */}
        {challenge && (
          <div className="mt-3 text-center text-xs text-gray-500 font-mono">
            targetX: {challenge.targetX}px &nbsp;|&nbsp; thumbX: {Math.round(thumbX)}px &nbsp;|&nbsp;
            偏差: {Math.abs(thumbX - challenge.targetX).toFixed(1)}px
            {status === "idle" && (
              <span className="ml-2 text-gray-600">
                (容差 ±{TOLERANCE_PX}px)
              </span>
            )}
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800/50 p-3 text-xs text-gray-400">
          <p className="font-medium text-gray-300 mb-1">测试说明：</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>拖动滑块，观察背景图上拼图块跟随移动</li>
            <li>将拼图块与背景缺口对齐 → 松手验证</li>
            <li>偏差 ≤ {TOLERANCE_PX}px 即视为对齐成功</li>
            <li>点击「刷新」可生成新的挑战</li>
          </ul>
        </div>
      </div>
    </div>
  );
}