"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DECO_SVG, type Shichen } from "@/lib/shichen";

/**
 * 辰巳午未 · 水平滚动面板
 *
 *  核心思路（GSAP + ScrollTrigger）：
 *   1. 外层 .vitalog-noon-pin 作为 ScrollTrigger trigger + pin 容器
 *      - pin: true 会让它在视口内停留，期间吃下 (n-1)*100vh 的滚动距离
 *   2. 中层 .vitalog-noon-stage 是真正被钉住的舞台（全屏 100vw × 100vh）
 *   3. 内层 .vitalog-noon-track 是横向轨道（4 × 100vw = 400vw）
 *   4. GSAP tween: x: 0 → -(track.scrollWidth - innerWidth)，scrub 跟随滚动
 *   5. 期间通过 CustomEvent 向 BgLayer / TimeRibbon 通报子进度
 *
 *  跨组件通讯（极简）:
 *   - window 'noon:progress' { detail: number } 0..1
 *   - window 'noon:active'    { detail: number } 0..3（对应 4/5/6/7 全局索引）
 *   - window 'noon:enter' / 'noon:leave'
 */
const NOON_INDICES = [4, 5, 6, 7] as const;

export function NoonHorizontalPanel({ shichenData }: { shichenData: readonly Shichen[] }) {
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const noonData = NOON_INDICES.map((i) => shichenData[i]);

  useLayoutEffect(() => {
    const pin = pinRef.current;
    const track = trackRef.current;
    if (!pin || !track) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // 4 个真实 slide + 1 个尾部占位（提供右侧留白）
      // tween 只走 (n-1)*100vw，最后一个真实 slide 显示时右侧自带一屏留白
      const slideCount = noonData.length;
      const travel = (slideCount - 1) * window.innerWidth;
      const tween = gsap.to(track, {
        x: () => -travel,
        ease: "none",
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: () => `+=${travel}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onEnter: () => {
            window.dispatchEvent(new CustomEvent("noon:enter"));
          },
          onLeave: () => {
            window.dispatchEvent(new CustomEvent("noon:leave"));
          },
          onEnterBack: () => {
            window.dispatchEvent(new CustomEvent("noon:enter"));
          },
          onLeaveBack: () => {
            window.dispatchEvent(new CustomEvent("noon:leave"));
          },
          onUpdate: (self) => {
            const p = self.progress;
            // 把子进度写回 CSS 变量，供顶部进度条使用
            pin.style.setProperty("--noon-progress", String(p));
            window.dispatchEvent(
              new CustomEvent("noon:progress", { detail: p })
            );
            const idx = Math.min(
              noonData.length - 1,
              Math.floor(p * noonData.length)
            );
            window.dispatchEvent(
              new CustomEvent("noon:active", { detail: 4 + idx })
            );
          },
        },
      });

      return () => {
        tween.kill();
      };
    }, pin);

    // 字体 / 图片加载后位置会变，刷新一次
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={pinRef}
      className="vitalog-noon-pin"
      data-shi-panel="noon"
      data-shi-idx="4"
      aria-label="辰巳午未 水平时辰带"
    >
      <div className="vitalog-noon-stage">
        <div className="vitalog-noon-progress" aria-hidden>
          <span className="vitalog-noon-progress__bar" />
        </div>

        <div className="vitalog-noon-hint" aria-hidden>
          <span>SCROLL</span>
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </div>

        <div ref={trackRef} className="vitalog-noon-track">
          {noonData.map((s, i) => (
            <NoonSlide
              key={s.char}
              s={s}
              globalIdx={NOON_INDICES[i]}
              pos={i}
              total={noonData.length}
              isLast={i === noonData.length - 1}
            />
          ))}
          {/* 尾部占位 slide：tween 终点恰好停在"未"显示，spacer 跑出视口外 */}
          <div
            className="vitalog-noon-slide vitalog-noon-slide--spacer"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

function NoonSlide({
  s,
  globalIdx,
  pos,
  total,
  isLast,
}: {
  s: Shichen;
  globalIdx: number;
  pos: number;
  total: number;
  isLast?: boolean;
}) {
  const hasImage = !!(s as any).image;
  return (
    <article
      className={`vitalog-noon-slide ${hasImage ? "vitalog-shi--has-img" : ""} ${isLast ? "vitalog-noon-slide--last" : ""}`}
      data-shi-idx={globalIdx}
      style={{ ["--shi-accent" as string]: s.accentVar }}
    >
      <div className="vitalog-noon-slide__inner">
        <div className="vitalog-noon-slide__head">
          <span className="vitalog-noon-slide__pos">
            {String(pos + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span className="vitalog-noon-slide__tag">{s.tag}</span>
        </div>

        <h2 className="vitalog-noon-slide__char">{s.char}</h2>

        <p className="vitalog-noon-slide__classical">{s.quote}</p>

        <p className="vitalog-noon-slide__range">
          <span>{s.range}</span>
          <span className="vitalog-noon-slide__dot">·</span>
          <span>{s.name}</span>
        </p>

        <div className="vitalog-noon-slide__body">
          {s.body.split("\n").map((line, k) => (
            <p key={k}>{line}</p>
          ))}
        </div>

        <div className="vitalog-noon-slide__meta">
          {Object.entries(s.meta).map(([k, v]) => (
            <span key={k}>
              <em>{k}</em>
              <strong>{v}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* 时辰配图 */}
      {hasImage && (s as any).image && (
        <div
          className="vitalog-shi__img-frame"
          style={{ minHeight: 320, maxHeight: 440, height: "50vh" }}
        >
          <div className="vitalog-shi__img-wrap">
            <img
              src={(s as any).image}
              alt={s.name}
              className="vitalog-shi__img"
              loading="lazy"
              decoding="async"
            />
            <div className="vitalog-shi__img-veil" aria-hidden />
            <div className="vitalog-shi__img-caption">
              <span className="vitalog-shi__img-caption-char">{s.char}</span>
              <span className="vitalog-shi__img-caption-text">
                {s.range} · {s.name}
              </span>
            </div>
          </div>
        </div>
      )}

      <div
        className="vitalog-noon-slide__art"
        aria-hidden
        style={{ color: s.accentVar }}
        dangerouslySetInnerHTML={{ __html: DECO_SVG[s.deco] }}
      />
    </article>
  );
}

export default NoonHorizontalPanel;
