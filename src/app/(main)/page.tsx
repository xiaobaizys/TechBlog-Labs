import { HomeExperience } from "@/components/home/HomeExperience";

/**
 * 主页 · 一日十二时辰
 *
 *  - 唯一使命：让用户感受「十二时辰」的滚动叙事
 *  - 所有预览区块（关于 / 文章 / 项目 / 联系）已迁出到各自专属页
 *  - 保持 server 组件以便未来做 SEO/分享卡片
 *
 *  首屏加载策略：
 *  - 背景通过 BgLayer（CSS 渐变色）实现，无需图片预加载
 *  - GSAP（GSAPHorizontalPanel）等重依赖由各组件内部 next/dynamic 接管
 */
export default function HomePage() {
  return (
    <main className="vitalog-home">
      <HomeExperience />
    </main>
  );
}
