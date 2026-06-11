"use client";

import dynamic from "next/dynamic";
import { BgLayer } from "./BgLayer";
import { TimeRibbon } from "./TimeRibbon";
import { HeroIntro } from "./HeroIntro";
import { TwelveShichen } from "./TwelveShichen";
import { LazyOnIdle } from "@/components/util/LazyMount";

/* ============================================================
   按需加载（next/dynamic · ssr: false）
   ------------------------------------------------------------
   首屏只加载首屏可见且与滚动位置无关的组件，其它延后注入：
   - ScrollProgress · BgLayer · TimeRibbon · HeroIntro · TwelveShichen
     都参与首屏 / 紧随首屏，必须立即可用 → 同步加载
   - Dust（canvas 粒子）→ 浏览器空闲时挂载，节省主线程
   - BackToTop → 用户滚过首屏才挂载，避免空闲 JS 占用
   - NoonHorizontalPanel（GSAP）由 TwelveShichen 内部 dynamic 化，
     首屏完全不下载 GSAP（~80KB）
   ============================================================ */

const Dust = dynamic(
  () => import("./Dust").then((m) => m.Dust),
  { ssr: false, loading: () => null }
);

const ScrollProgressLazy = dynamic(
  () => import("./ScrollProgress").then((m) => m.ScrollProgress),
  { ssr: false, loading: () => null }
);

const BackToTopLazy = dynamic(
  () => import("./ScrollProgress").then((m) => m.BackToTop),
  { ssr: false, loading: () => null }
);

/**
 * 体验层：管理首页所有固定层 UI
 *
 *  顺序（z-index 由低到高）：
 *   - BgLayer        (z-0)   滚动驱动的固定背景层，颜色随 scrollYProgress 在 12 节间插值
 *   - Dust           (z-1)   记忆尘埃（空闲挂载）
 *   - ScrollProgress (z-90)  顶部琥珀色进度条
 *   - TimeRibbon     (z-70)  右侧十二时辰导航
 *   - HeroIntro      (z-5)   首页开场：12 个时辰 / EXPLORE 按钮
 *   - TwelveShichen  (z-5)   主体十二时辰（背景透明，由 BgLayer 透出；内部 GSAP 面板按需）
 *   - BackToTop      (z-50)  返回顶部按钮（仅滚过 80% 后挂载）
 *   - TopHeader      (z-80)  顶部导航（由 layout 注入）
 *
 *  自定义光标已移除，恢复浏览器默认指针
 */
export function HomeExperience() {
  return (
    <>
      {/* 滚动驱动背景层（仿 GSAP scrub：12 节颜色随滚动位置 1:1 插值） */}
      <BgLayer />

      {/* 装饰层：浏览器空闲才挂载（避开首帧） */}
      <LazyOnIdle timeout={1500}>
        <Dust />
      </LazyOnIdle>

      {/* 顶部滚动进度条 */}
      <ScrollProgressLazy />

      {/* 固定导航层（右侧：十二时辰带） */}
      <TimeRibbon />

      {/* 首页开场：4 张背景图按需加载（首张立即显示，其余 3 张按需 fetch） */}
      <HeroIntro />

      {/* 主体十二时辰：内部 NoonHorizontalPanel 已 dynamic 化 */}
      <TwelveShichen />

      {/* 浮层交互：返回顶部（仅滚过 80% 后挂载） */}
      <BackToTopLazy />
    </>
  );
}

export default HomeExperience;
