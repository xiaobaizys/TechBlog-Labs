import { HomeExperience } from "@/components/home/HomeExperience";

/**
 * 主页 · 一日十二时辰
 *
 *  - 唯一使命：让用户感受「十二时辰」的滚动叙事
 *  - 所有预览区块（关于 / 文章 / 项目 / 联系）已迁出到各自专属页
 *  - 保持 server 组件以便未来做 SEO/分享卡片
 *
 *  首屏加载策略：
 *  - 预加载首张 Hero 背景（首屏最大、最重的一张图）
 *  - GSAP（GSAPHorizontalPanel）等重依赖由各组件内部 next/dynamic 接管
 */
export default function HomePage() {
  return (
    <main className="vitalog-home">
      <link
        rel="preload"
        as="image"
        href="/image/background%20(1).png"
        // 兼顾 light/dark 模式（这里背景图不随主题变化，但 fetchpriority 仍按主屏优先）
        fetchPriority="high"
      />
      <HomeExperience />
    </main>
  );
}
