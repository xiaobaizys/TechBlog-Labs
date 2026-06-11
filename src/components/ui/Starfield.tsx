'use client';

import { useEffect, useRef, useState } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
  phase: number;
}

interface Meteor {
  x: number;
  y: number;
  speed: number;
  angle: number;
  length: number;
  trail: { x: number; y: number; age: number }[];
  maxAge: number;
  life: number;
}

const STAR_DENSITY_DIVISOR = 7000; // 数值越大星点越稀疏（v1 是 4500，v2 更克制）
const MAX_METEORS = 3;
const MIN_SPAWN_INTERVAL = 4000;
const MAX_SPAWN_INTERVAL = 9000;

function generateStars(width: number, height: number): Star[] {
  const count = Math.floor((width * height) / STAR_DENSITY_DIVISOR);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.85, // 限制在底部 85% 区域
      size: Math.random() * 1.2 + 0.3,
      baseOpacity: Math.random() * 0.4 + 0.25,
      twinkleSpeed: Math.random() * 2 + 0.5,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function spawnMeteor(width: number, height: number): Meteor {
  return {
    x: Math.random() * width * 0.6,
    y: Math.random() * height * 0.25,
    speed: 7 + Math.random() * 5,
    angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
    length: 18 + Math.random() * 8,
    trail: [],
    maxAge: 30,
    life: 0,
  };
}

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const starsRef = useRef<Star[]>([]);
  const meteorsRef = useRef<Meteor[]>([]);
  const lastSpawnRef = useRef<number>(0);
  const nextSpawnDelayRef = useRef<number>(MIN_SPAWN_INTERVAL);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  // 主题感知：仅在暗色主题下渲染星空
  const [isDark, setIsDark] = useState(false);

  // 监听主题变化（next-themes 写入 .dark 到 <html>）
  useEffect(() => {
    const html = document.documentElement;
    const update = () => setIsDark(html.classList.contains('dark'));
    update();

    const observer = new MutationObserver(update);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // 浅色主题不渲染
    if (!isDark) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      starsRef.current = generateStars(w, h);
    };

    setupCanvas();

    const onResize = () => setupCanvas();
    window.addEventListener('resize', onResize);

    lastSpawnRef.current = performance.now();
    nextSpawnDelayRef.current =
      MIN_SPAWN_INTERVAL +
      Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL);

    const animate = (timestamp: number) => {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      // 星点（带闪烁）
      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const twinkle =
          Math.sin(timestamp * 0.001 * star.twinkleSpeed + star.phase) *
            0.5 +
          0.5;
        const opacity = star.baseOpacity * (0.35 + 0.65 * twinkle);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 流星生成节奏控制
      if (
        timestamp - lastSpawnRef.current > nextSpawnDelayRef.current &&
        meteorsRef.current.length < MAX_METEORS
      ) {
        meteorsRef.current.push(spawnMeteor(w, h));
        lastSpawnRef.current = timestamp;
        nextSpawnDelayRef.current =
          MIN_SPAWN_INTERVAL +
          Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL);
      }

      // 流星更新与绘制
      const meteors = meteorsRef.current;
      for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        meteor.life += 1;

        const headX = meteor.x + Math.cos(meteor.angle) * meteor.speed;
        const headY = meteor.y + Math.sin(meteor.angle) * meteor.speed;
        meteor.x = headX;
        meteor.y = headY;

        meteor.trail.unshift({ x: headX, y: headY, age: 0 });
        if (meteor.trail.length > meteor.length) meteor.trail.pop();
        for (let j = 0; j < meteor.trail.length; j++) meteor.trail[j].age += 1;

        for (let j = 0; j < meteor.trail.length; j++) {
          const point = meteor.trail[j];
          const trailOpacity = (1 - point.age / meteor.maxAge) * 0.8;
          if (trailOpacity <= 0) continue;
          const radius = (1 - j / meteor.trail.length) * 1.2 + 0.2;
          ctx.fillStyle = `rgba(255, 220, 170, ${trailOpacity})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        if (headX > w + 100 || headY > h + 100 || meteor.life > 240) {
          meteors.splice(i, 1);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', onResize);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      starsRef.current = [];
      meteorsRef.current = [];
    };
  }, [isDark]);

  // 浅色主题不渲染 canvas
  if (!isDark) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}

export default Starfield;
