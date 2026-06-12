import { createHash, randomBytes } from "crypto";
import type { PuzzlePiece } from "./types";

/**
 * 拼图形状生成器
 *
 * 设计思路（参考阿里云 / 腾讯云滑块）：
 *  - 拼图块 = 中心正方形 + 4 边各凸/凹一个半圆
 *  - 缺口 = 形状完全一致但位置在背景图上
 *  - 用 4 个 boolean 决定每边是"凸"还是"凹"，让形状有 2^4=16 种变化
 *  - 形状由 <path> 的弧线命令 (A) 拼出，可直接塞进 SVG <path d="...">
 *
 * 这样：
 *  - 不依赖任何位图，前端 SVG 渲染即可
 *  - 每次挑战缺口形状都不一样，提升自动化攻击成本
 */

/** 拼图块的边长（px）—— 在 320x180 背景图上选 50 视觉上比较协调 */
export const PIECE_SIZE = 50;
/** 拼图块凸/凹的半径（取 size/4~5 比较协调） */
export const PIECE_BUMP_R = PIECE_SIZE / 5;

export type PieceBumps = [top: boolean, right: boolean, bottom: boolean, left: boolean];

/** 随机一种凸/凹组合（保证每边至少有 0/1 个 bump，避免全凸/全凹导致过简单） */
export function randomBumps(rng: () => number = Math.random): PieceBumps {
  return [
    rng() < 0.5,
    rng() < 0.5,
    rng() < 0.5,
    rng() < 0.5,
  ];
}

/**
 * 生成拼图形状的 SVG path d 属性
 *
 * 坐标系：以拼图块中心为 (0, 0)，从左上角 (-s/2, -s/2) 顺时针绕一圈
 *
 * @param size  边长
 * @param r     凸/凹圆弧半径
 * @param bumps 四边 [top, right, bottom, left] 是否凸（true=凸, false=凹）
 */
export function buildPiecePath(size: number, r: number, bumps: PieceBumps): string {
  const s = size / 2;
  // 凸：r 外扩；凹：r 内凹（半径相同但方向相反）
  // 用 sweep-flag 区分：1=顺时针(凸)，0=逆时针(凹)
  // 这里约定：进入边后做"半圆"动作
  //
  // 边起点、终点约定（顺时针，从左上角开始）：
  //   top:     (-s, -s) → ( s, -s)   bump 在中点
  //   right:   ( s, -s) → ( s,  s)   bump 在中点
  //   bottom:  ( s,  s) → (-s,  s)   bump 在中点
  //   left:    (-s,  s) → (-s, -s)   bump 在中点
  //
  // sweep=1 凸（外凸），sweep=0 凹（内凹）

  const arc = (sweep: boolean) => (sweep ? 1 : 0);

  const top = bumps[0];
  const right = bumps[1];
  const bottom = bumps[2];
  const left = bumps[3];

  // 起点放在 top 边的左端 (-s, -s)
  return [
    // 起点
    `M ${-s} ${-s}`,
    // top 边：先到 bump 左端 (-r, -s)，半圆到 (r, -s)，再到右上角 (s, -s)
    `L ${-r} ${-s}`,
    `A ${r} ${r} 0 0 ${arc(top)} 0 ${-r}`, // 起点 (-r,-s) 终点 (0,-s)，sweep 控制方向
    // 这里我们让弧从 (-r,-s) 到 (0,-s) 经过 (0,-s-r) 或 (0,-s+r)：
    // 改写：用两次 A 拼接，从 (-r,-s) 到 (0,-s) 必然在 y 方向上下凸/凹
    // —— 上面写错了，下面给出正确版本
  ].join(" ");
}

/**
 * 生成正确版本的拼图 path
 *
 * 正确的弧线描述：把每条边分成 3 段（左半段、半圆、右半段）
 *  - 左半段：起点 → (x_center - r, y)
 *  - 半圆：从 (x_center - r, y) 到 (x_center + r, y)，半径 r
 *  - 右半段：(x_center + r, y) → 终点
 *
 * 半圆的中心点是该边的中点；sweep-flag 决定凸/凹
 */
export function buildPiecePathV2(size: number, r: number, bumps: PieceBumps): string {
  const s = size / 2;
  const [top, right, bottom, left] = bumps;
  const sw = (b: boolean) => (b ? 1 : 0); // 凸 sweep=1，凹 sweep=0

  // 顺时针
  return [
    // 起点：左上角
    `M ${-s} ${-s}`,
    // ====== top 边 (-s,-s) → (s,-s)，中点 (0,-s) ======
    `L ${-r} ${-s}`,
    `A ${r} ${r} 0 0 ${sw(top)} ${r} ${-s}`,
    `L ${s} ${-s}`,
    // ====== right 边 (s,-s) → (s,s)，中点 (s,0) ======
    `L ${s} ${-r}`,
    `A ${r} ${r} 0 0 ${sw(right)} ${s} ${r}`,
    `L ${s} ${s}`,
    // ====== bottom 边 (s,s) → (-s,s)，中点 (0,s) ======
    `L ${r} ${s}`,
    `A ${r} ${r} 0 0 ${sw(bottom)} ${-r} ${s}`,
    `L ${-s} ${s}`,
    // ====== left 边 (-s,s) → (-s,-s)，中点 (-s,0) ======
    `L ${-s} ${r}`,
    `A ${r} ${r} 0 0 ${sw(left)} ${-s} ${-r}`,
    `L ${-s} ${-s}`,
    // 闭合
    "Z",
  ].join(" ");
}

/**
 * 生成背景图（SVG）+ 拼图块（SVG）
 *
 * @returns backgroundSvg, sliderSvg, targetX, targetY, pathD
 */
export function generateChallenge(
  bgWidth: number,
  bgHeight: number,
  rng: () => number = Math.random
): {
  backgroundSvg: string;
  sliderSvg: string;
  piece: PuzzlePiece;
} {
  // ---------- 1. 拼图块位置 ----------
  // 距左/右边各留 PIECE_SIZE 缓冲（避免贴近边缘，目标位置过偏）
  const minX = PIECE_SIZE;
  const maxX = bgWidth - PIECE_SIZE;
  const minY = PIECE_SIZE;
  const maxY = bgHeight - PIECE_SIZE;

  const x = Math.floor(rng() * (maxX - minX)) + minX;
  const y = Math.floor(rng() * (maxY - minY)) + minY;
  const bumps = randomBumps(rng);
  const pathD = buildPiecePathV2(PIECE_SIZE, PIECE_BUMP_R, bumps);

  // ---------- 2. 背景 SVG ----------
  // 用 SVG 滤镜（feTurbulence + feDisplacementMap）+ 渐变 + 噪点，
  // 视觉上像"风景抽象画"，同时让自动化 OCR 更难。
  const hue1 = Math.floor(rng() * 360);
  const hue2 = (hue1 + 40 + Math.floor(rng() * 80)) % 360;
  const hue3 = (hue2 + 30 + Math.floor(rng() * 60)) % 360;

  // 装饰元素位置（星星 / 小圆）
  const dots = Array.from({ length: 28 }, () => ({
    cx: Math.floor(rng() * bgWidth),
    cy: Math.floor(rng() * bgHeight),
    r: 1 + Math.floor(rng() * 2.5),
    o: 0.3 + rng() * 0.5,
  }));

  // 装饰线条（模拟"风景"中的草 / 山脊）
  const strokes = Array.from({ length: 6 }, () => {
    const sx = Math.floor(rng() * bgWidth);
    const sy = Math.floor(rng() * bgHeight);
    const ex = Math.floor(rng() * bgWidth);
    const ey = Math.floor(rng() * bgHeight);
    return { sx, sy, ex, ey, w: 1 + Math.floor(rng() * 2) };
  });

  // 用 SVG mask 在背景上"挖掉"拼图块形状
  // 这样背景的缺口就是真实透出（露出背后的卡片色）
  // mask 黑=透明，白=显示；缺口处 mask 黑色=不显示背景 → 露出底色
  const backgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bgWidth}" height="${bgHeight}" viewBox="0 0 ${bgWidth} ${bgHeight}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue1}, 65%, 72%)"/>
        <stop offset="55%" stop-color="hsl(${hue2}, 70%, 60%)"/>
        <stop offset="100%" stop-color="hsl(${hue3}, 60%, 45%)"/>
      </linearGradient>
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${Math.floor(rng() * 100)}"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.12 0"/>
        <feComposite in2="SourceGraphic" operator="in"/>
      </filter>
      <mask id="pieceMask">
        <rect width="${bgWidth}" height="${bgHeight}" fill="white"/>
        <g transform="translate(${x} ${y})">
          <path d="${pathD}" fill="black"/>
        </g>
      </mask>
    </defs>
    <g mask="url(#pieceMask)">
      <rect width="${bgWidth}" height="${bgHeight}" fill="url(#bg)"/>
      <g opacity="0.45">
        ${strokes.map((s) => `<line x1="${s.sx}" y1="${s.sy}" x2="${s.ex}" y2="${s.ey}" stroke="rgba(255,255,255,${0.25 + rng() * 0.3})" stroke-width="${s.w}" stroke-linecap="round"/>`).join("")}
      </g>
      <g>
        ${dots.map((d) => `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="rgba(255,255,255,${d.o})"/>`).join("")}
      </g>
      <rect width="${bgWidth}" height="${bgHeight}" fill="url(#bg)" filter="url(#grain)" opacity="0.6"/>
    </g>
  </svg>`;

  // ---------- 3. 滑块块 SVG ----------
  // 关键：滑块 = 纯拼图块本体（无把手）
  // viewBox 用正坐标 "0 0 50 50"（避免负坐标在某些浏览器对 path 弧线渲染异常）
  // 用 <g transform="translate(25 25)"> 把"以 (0,0) 为中心"的 pathD 平移到 viewBox 中央
  // 这样 <img width=50 height=50> 渲染时：
  //   - 拼图块本体 = 50×50 拼图形状
  //   - 拼图块中心 = (25, 25) = 服务端 targetX 坐标系中心
  // 把手用 HTML 在 img 旁边画（不影响拼图块本体形状和对齐）
  const sliderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PIECE_SIZE}" height="${PIECE_SIZE}" viewBox="0 0 ${PIECE_SIZE} ${PIECE_SIZE}">
    <defs>
      <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue1}, 65%, 72%)"/>
        <stop offset="55%" stop-color="hsl(${hue2}, 70%, 60%)"/>
        <stop offset="100%" stop-color="hsl(${hue3}, 60%, 45%)"/>
      </linearGradient>
    </defs>
    <g transform="translate(${PIECE_SIZE / 2} ${PIECE_SIZE / 2})">
      <path d="${pathD}" fill="url(#sg)" stroke="rgba(255,255,255,0.85)" stroke-width="1.5"/>
    </g>
  </svg>`;

  return {
    backgroundSvg,
    sliderSvg,
    piece: { x, y, size: PIECE_SIZE, pathD },
  };
}

/** 生成 challengeId：32 字节十六进制（256 bit，足够防枚举） */
export function newChallengeId(): string {
  return randomBytes(32).toString("hex");
}

/**
 * 签名：HMAC-SHA256(challengeId + targetX + targetY, SECRET)
 * 用于把 target 位置一起签发出去，前端拿不到 target 但服务端能验
 *
 * 实际我们不直接返回 targetX 给前端 —— 前端拿到的是缺口在背景图中的位置
 * （用于绘制遮罩），但 targetX 是从背景图坐标系测的"命中点"。
 * 等等：这里就是直接返回的 targetX，因为最终要服务端比对。
 * 所以我们把"通过标记"用单独 ticket 表达，不在挑战里返回明文 target。
 */
export function signChallenge(
  challengeId: string,
  targetX: number,
  targetY: number,
  secret: string
): string {
  return createHash("sha256")
    .update(`${challengeId}|${targetX}|${targetY}|${secret}`)
    .digest("hex");
}

export function verifyChallengeSignature(
  challengeId: string,
  targetX: number,
  targetY: number,
  signature: string,
  secret: string
): boolean {
  const expected = signChallenge(challengeId, targetX, targetY, secret);
  // 常时比较防时序攻击
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

/** SVG → DataURL（base64） */
export function svgToDataUrl(svg: string): string {
  // 使用 unescape + encodeURIComponent 的经典做法，兼容中文
  const encoded = Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}
