"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/lib/toast";
import { generateChallenge, PIECE_SIZE as GEN_PIECE_SIZE } from "@/lib/captcha/generator";

/* ============================================================
 * 类型
 * ============================================================ */

type Challenge = {
  challengeId: string;
  backgroundDataUrl: string;
  sliderDataUrl: string;
  targetX: number;
  targetY: number;
  pieceSize: number;
  bgWidth: number;
  bgHeight: number;
  expiresAt: number;
};

type Status = "loading" | "ready" | "dragging" | "verifying" | "success" | "fail";

type Props = {
  /** 验证通过时回调（拿到 ticket） */
  onSuccess: (ticket: string) => void;
  /** 取消 / 关闭时回调（不触发业务） */
  onCancel?: () => void;
  /** 透传的"打开/关闭"控制 */
  open: boolean;
  /** mock 模式：本地生成挑战数据并验证，无需后端 Redis，方便开发测试 */
  mock?: boolean;
};

/* ============================================================
 * 常量
 * ============================================================ */

/** 滑块中"拼图块"的视觉边长 = 后端 PIECE_SIZE = 50（与服务端 targetX/Y 坐标系 1:1） */
const PIECE_SIZE = 50;
/** 把手（HTML 装饰）宽高 */
const HANDLE_W = 18;
const HANDLE_H = 32;
/** 验证 X 方向容差（px）—— 与服务端一致 */
const TOLERANCE_PX = 5;
/** 吸附半径（px）：松手时若 thumb 距目标 ≤ 此值，自动吸附到精确位置 */
const SNAP_RADIUS = 15;

/* ============================================================
 * Mock 辅助函数（无需后端 Redis，浏览器内生成挑战）
 * ============================================================ */

/** 浏览器兼容的 SVG → DataURL（使用 encodeURIComponent 替代 Buffer） */
function svgToDataUrlBrowser(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** 生成 mock 挑战数据，与 API 返回结构完全一致 */
function generateMockChallenge(): Challenge {
  const { backgroundSvg, sliderSvg, piece } = generateChallenge(320, 180);
  const id = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return {
    challengeId: id,
    backgroundDataUrl: svgToDataUrlBrowser(backgroundSvg),
    sliderDataUrl: svgToDataUrlBrowser(sliderSvg),
    targetX: piece.x,
    targetY: piece.y,
    pieceSize: piece.size,
    bgWidth: 320,
    bgHeight: 180,
    expiresAt: Date.now() + 3 * 60 * 1000,
  };
}

/* ============================================================
 * API 调用封装
 * ============================================================ */

async function fetchChallenge(): Promise<Challenge> {
  const res = await fetch("/api/auth/captcha/challenge", { method: "POST" });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? "获取验证挑战失败");
  }
  return json.data as Challenge;
}

async function verifyChallenge(
  challengeId: string,
  finalX: number,
  track: Array<{ x: number; y: number; t: number }>
): Promise<{ ok: boolean; reason?: string; ticket?: string }> {
  const res = await fetch("/api/auth/captcha/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId, finalX, track }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    return { ok: false, reason: json.reason ?? "unknown" };
  }
  return { ok: true, ticket: json.data.ticket };
}

/* ============================================================
 * 主组件
 *
 * 设计要点：
 *  - 背景图显示拼图缺口（用 SVG mask 实现），不显示拼图块
 *  - 滑块 thumb 渲染拼图块（与缺口同源同形状）
 *  - 在背景图上叠加一个可移动的拼图块，位置跟随 thumbX
 *  - 用户拖动滑块时，背景图上的拼图块同步移动
 *  - 当拼图块与缺口完全重合时 = 正确位置
 *  - "方块对齐方块"，体验更直观
 *  - thumb 的视觉中心 = thumbOffset（拼图块中心对齐 thumbOffset）
 *  - 验证时把 thumbOffset 提交给服务端即可
 * ============================================================ */

export function SliderCaptcha({ onSuccess, onCancel, open, mock = false }: Props) {
  // ---- 状态 ----
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [now, setNow] = useState(Date.now());

  // thumb 中心 X 坐标（px，与背景图坐标系 1:1）
  const [thumbX, setThumbX] = useState(0);
  // 同步 ref：用于在拖拽回调里读到最新的 thumbX（避免闭包陷阱）
  const thumbXRef = useRef(0);
  // 拖拽轨迹
  const trackRef = useRef<Array<{ x: number; y: number; t: number }>>([]);
  // 拖拽起点：记录指针位置与 thumbX 的关系
  const dragStartRef = useRef<{ pointerX: number; thumbX: number } | null>(null);
  // 滑轨 ref（用于把指针坐标换算到 thumbX）
  const trackElRef = useRef<HTMLDivElement>(null);

  // ---- 加载挑战 ----
  const loadNew = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    setThumbX(0);
    trackRef.current = [];
    try {
      const c = mock ? generateMockChallenge() : await fetchChallenge();
      setChallenge(c);
      setStatus("ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "加载失败";
      setErrorMsg(msg);
      setStatus("fail");
    }
  }, [mock]);

  useEffect(() => {
    if (open && !challenge) {
      void loadNew();
    }
  }, [open, challenge, loadNew]);

  // 倒计时
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const remaining = useMemo(() => {
    if (!challenge) return 0;
    return Math.max(0, Math.floor((challenge.expiresAt - now) / 1000));
  }, [challenge, now]);

  // 过期自动标记失败
  useEffect(() => {
    if (
      open &&
      challenge &&
      remaining === 0 &&
      status !== "verifying" &&
      status !== "success"
    ) {
      setErrorMsg("验证已过期，请刷新");
      setStatus("fail");
    }
  }, [open, challenge, remaining, status]);

  // ---- 拖拽：将指针 X 换算到 thumbX ----
  // 关键公式：thumbX = 滑轨内偏移(px) = 指针 clientX - 滑轨 left
  // 与背景图坐标系 1:1（滑轨与背景图等宽）
  const updateThumbFromPointer = (clientX: number) => {
    if (!challenge || !trackElRef.current) return;
    const rect = trackElRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    // 限制范围：[pieceSize/2, bgWidth - pieceSize/2]
    // 拼图块中心必须在 [25, bgWidth-25] 内，保证拼图块不出界
    const minX = challenge.pieceSize / 2;
    const maxX = challenge.bgWidth - challenge.pieceSize / 2;
    const clamped = Math.max(minX, Math.min(maxX, x));
    setThumbX(clamped);
    thumbXRef.current = clamped;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (status !== "ready" || !challenge) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateThumbFromPointer(e.clientX);
    trackRef.current = [{ x: thumbXRef.current, y: 0, t: Date.now() }];
    setStatus("dragging");
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (status !== "dragging") return;
    e.preventDefault();
    updateThumbFromPointer(e.clientX);
    // 轨迹采样（用 ref 拿到最新 thumbX，避免闭包陷阱）
    const last = trackRef.current[trackRef.current.length - 1];
    if (!last || Date.now() - last.t > 30) {
      trackRef.current.push({ x: thumbXRef.current, y: 0, t: Date.now() });
    }
  };

  const onPointerUp = async (e: React.PointerEvent) => {
    if (status !== "dragging" || !challenge) return;
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragStartRef.current = null;

    // ---- 吸附：松手时若拇指在目标附近，自动吸附到精确位置 ----
    const dx = Math.abs(thumbXRef.current - challenge.targetX);
    if (dx > TOLERANCE_PX && dx <= SNAP_RADIUS) {
      setThumbX(challenge.targetX);
      thumbXRef.current = challenge.targetX;
      // 短暂延迟让用户看到吸附效果再进入验证状态
      await new Promise((r) => setTimeout(r, 120));
    }

    setStatus("verifying");

    try {
      const finalX = thumbXRef.current;
      const track = trackRef.current;

      if (mock) {
        // ---- mock 模式：本地校验，无需后端 ----
        const d = Math.abs(finalX - challenge.targetX);
        if (d <= TOLERANCE_PX) {
          const fakeTicket = Array.from({ length: 24 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join("");
          setStatus("success");
          onSuccess(fakeTicket);
        } else {
          setErrorMsg("位置不正确");
          setStatus("fail");
          toast.error("位置不正确");
        }
      } else {
        // ---- 生产模式：调用后端 API ----
        const result = await verifyChallenge(challenge.challengeId, finalX, track);
        if (result.ok && result.ticket) {
          setStatus("success");
          setTimeout(() => onSuccess(result.ticket!), 500);
        } else {
          setErrorMsg(failReasonText(result.reason));
          setStatus("fail");
          toast.error(failReasonText(result.reason));
        }
      }
    } catch {
      setErrorMsg("网络错误，请重试");
      setStatus("fail");
    }
  };

  // 失败后自动回到 ready 状态
  useEffect(() => {
    if (status !== "fail") return;
    const t = setTimeout(() => {
      setThumbX(0);
      trackRef.current = [];
      setStatus(challenge ? "ready" : "loading");
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ---- 渲染 ----
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (
            e.target === e.currentTarget &&
            status !== "verifying" &&
            status !== "dragging"
          ) {
            onCancel?.();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 20, stiffness: 280 }}
          className="w-full max-w-sm rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-2xl"
        >
          {/* 标题 */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-medium">拼图滑块验证</h3>
            {challenge && (
              <span
                className={`text-xs font-mono ${
                  remaining < 30
                    ? "text-red-500"
                    : "text-[rgb(var(--muted-foreground))]"
                }`}
              >
                {formatTime(remaining)}
              </span>
            )}
          </div>

          {/* ============================================================
             图片区：背景图（带缺口）+ 叠加的可拖动拼图块
             ============================================================ */}
          <div
            className="relative overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]"
            style={{
              width: challenge?.bgWidth ?? 320,
              height: challenge?.bgHeight ?? 180,
              margin: "0 auto",
            }}
          >
            {/* 背景图（含 SVG mask 切出的拼图缺口） */}
            {challenge && (
              <img
                src={challenge.backgroundDataUrl}
                alt="captcha"
                draggable={false}
                className="block h-full w-full"
              />
            )}

            {/* 可拖动的拼图块：叠加在背景图上，用户将其对齐下方的缺口
                位置跟随 thumbX，与滑块轨道中的 thumb 同步移动
                当拼图块与缺口完全重合时 = 验证通过 */}
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
                      ? "drop-shadow(0 0 6px rgba(16,185,129,0.6))"
                      : status === "fail"
                      ? "drop-shadow(0 0 6px rgba(239,68,68,0.6))"
                      : "drop-shadow(0 2px 6px rgba(0,0,0,0.3))",
                  transition: "filter 0.2s ease",
                }}
              >
                <img
                  src={challenge.sliderDataUrl}
                  alt="moving piece"
                  draggable={false}
                  className="block h-full w-full"
                  style={{
                    opacity: status === "success" ? 1 : 0.85,
                  }}
                />
              </div>
            )}

            {/* 加载中 */}
            {status === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--card))]/80">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber border-t-transparent" />
              </div>
            )}

            {/* 成功 overlay */}
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-emerald-500/15 backdrop-blur-[1px]"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg"
                >
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* ============================================================
             滑轨：拼图块 thumb 在这里被拖动
             thumb 的 img 渲染为 50x50（与拼图块同尺寸），不会被拉伸
             ============================================================ */}
          {challenge && (
            <div
              className="mt-4"
              style={{ width: challenge.bgWidth, margin: "16px auto 0" }}
            >
              <div
                ref={trackElRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={`relative h-12 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))] touch-none ${
                  status === "ready"
                    ? "cursor-grab"
                    : status === "dragging"
                    ? "cursor-grabbing"
                    : "cursor-not-allowed"
                }`}
              >
                {/* 已完成段（彩色填充） */}
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

                {/* ====== 拼图块本体：50×50 纯拼图块 img ======
                    left = thumbX - 25 → img 中心 = thumbX
                    这就是与服务端 targetX 1:1 对应的"拼图块中心" */}
                <img
                  src={challenge.sliderDataUrl}
                  alt="slider"
                  draggable={false}
                  className={`absolute top-1/2 -translate-y-1/2 block transition-opacity ${
                    status === "ready" || status === "dragging"
                      ? "opacity-100"
                      : "opacity-60"
                  }`}
                  style={{
                    left: thumbX - PIECE_SIZE / 2,
                    width: PIECE_SIZE,
                    height: PIECE_SIZE,
                    pointerEvents: "none",
                  }}
                />

                {/* ====== 把手：HTML 装饰，紧贴拼图块右侧外面 ======
                    中心 = thumbX + 25（拼图块右边缘外 9px）
                    这样视觉上"拼图块+把手"是一个整体，但拼图块本身和
                    背景缺口 100% 同源同尺寸，thumbX 就是 targetX */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center rounded-md border transition-opacity ${
                    status === "ready" || status === "dragging"
                      ? "opacity-100"
                      : "opacity-60"
                  } ${
                    status === "success"
                      ? "bg-emerald-50 border-emerald-400"
                      : status === "fail"
                      ? "bg-red-50 border-red-400"
                      : "bg-white/90 border-amber/60"
                  }`}
                  style={{
                    left: thumbX + PIECE_SIZE / 2,
                    width: HANDLE_W,
                    height: HANDLE_H,
                    pointerEvents: "none",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                >
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                </div>

                {/* 提示文字 */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center pl-12 text-xs text-[rgb(var(--muted-foreground))]">
                  {status === "ready" && "向右滑动使方块对齐缺口"}
                  {status === "dragging" && "正在验证…"}
                  {status === "verifying" && "正在验证…"}
                  {status === "success" && "验证成功"}
                  {status === "fail" && "验证失败，请重试"}
                </div>

                {/* 失败时在 thumb 上加 X 标记 */}
                {status === "fail" && (
                  <div
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md"
                    style={{ left: thumbX }}
                  >
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 底部按钮：刷新 + 反馈 + 取消 */}
          <div className="mt-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={loadNew}
                disabled={status === "verifying" || status === "dragging"}
                className="inline-flex items-center gap-1.5 text-[rgb(var(--muted-foreground))] hover:text-amber-bright disabled:opacity-50"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
                刷新
              </button>
              <button
                type="button"
                onClick={() =>
                  toast.info("感谢反馈：此验证码对你来说是否困难？")
                }
                className="inline-flex items-center gap-1.5 text-[rgb(var(--muted-foreground))] hover:text-amber-bright"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                反馈
              </button>
            </div>
            <button
              type="button"
              onClick={() => onCancel?.()}
              className="text-[rgb(var(--muted-foreground))] hover:text-foreground"
            >
              取消
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ============================================================
 * 工具
 * ============================================================ */

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function failReasonText(reason?: string) {
  switch (reason) {
    case "expired":
      return "挑战已过期";
    case "mismatch":
      return "位置不正确";
    case "behavior":
      return "操作异常，请重试";
    case "rate-limit":
      return "尝试次数过多";
    case "missing":
      return "参数错误";
    default:
      return "验证失败";
  }
}
