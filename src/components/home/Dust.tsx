"use client";

import { useEffect, useRef } from "react";

/**
 * 记忆尘埃 Canvas（核心创新视觉）
 *
 *  - 35 颗极细颗粒（亮 / 暗双套配色）
 *  - 缓慢向上漂浮，循环到底部
 *  - 鼠标 80px 内会被推开（产生气流感）
 *  - DPR 适配，避免高分屏模糊
 *  - prefers-reduced-motion 时不绘制
 */
export function Dust() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const canvasEl: HTMLCanvasElement = canvas;
    const ctx2d: CanvasRenderingContext2D = ctx;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // 检查减少动画偏好
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return;

    type P = {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      a: number;
      phase: number;
      light: string;
      dark: string;
    };

    let particles: P[] = [];
    let mouseX = -9999;
    let mouseY = -9999;
    let raf = 0;
    let W = 0;
    let H = 0;

    // 主题感知：深色模式下用亮色颗粒，浅色用深色
    function readColors() {
      const isDark = document.documentElement.classList.contains("dark");
      return {
        light: isDark ? "237, 230, 218" : "60, 50, 40",
        dark: isDark ? "200, 149, 109" : "200, 130, 80",
      };
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvasEl.width = W * dpr;
      canvasEl.height = H * dpr;
      canvasEl.style.width = W + "px";
      canvasEl.style.height = H + "px";
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function init() {
      const count = Math.min(35, Math.floor((W * H) / 55000));
      const palette = readColors();
      particles = new Array(count).fill(0).map(() => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2 + 0.4,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(Math.random() * 0.3 + 0.08),
        a: Math.random() * 0.4 + 0.15,
        phase: Math.random() * Math.PI * 2,
        light: palette.light,
        dark: palette.dark,
      }));
    }

    function draw(now: number) {
      const t = now * 0.001;
      ctx2d.clearRect(0, 0, W, H);
      for (const p of particles) {
        // 鼠标推开
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.hypot(dx, dy);
        if (dist < 80 && dist > 0) {
          const force = ((80 - dist) / 80) * 0.6;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }
        p.x += p.vx + Math.sin(t + p.phase) * 0.1;
        p.y += p.vy;
        // 飘出顶部 → 回到底部
        if (p.y < -10) {
          p.y = H + 10;
          p.x = Math.random() * W;
        }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;

        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx2d.fillStyle = `rgba(${p.light}, ${p.a})`;
        ctx2d.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    init();
    raf = requestAnimationFrame(draw);

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    const onLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };
    const onResize = () => {
      resize();
      init();
    };
    // 主题切换时重新读取颜色
    const themeObserver = new MutationObserver(() => {
      const palette = readColors();
      particles.forEach((p) => {
        p.light = palette.light;
        p.dark = palette.dark;
      });
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", onResize, { passive: true });

    /* 页面隐藏时彻底停掉 RAF（节省主线程，导航到其他页时不浪费 CPU）
     * - 用户切到其他标签 / 最小化窗口：document.hidden === true
     * - 用户点击 nav 链接：浏览器在 push 完成后会进入 bfcache 候补，同样 hidden
     * - 回到首页时再继续 RAF
     */
    const onVisibility = () => {
      if (document.hidden) {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      } else if (!raf) {
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="vitalog-dust"
      aria-hidden="true"
    />
  );
}

export default Dust;
