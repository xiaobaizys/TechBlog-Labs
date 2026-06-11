import { TopHeader } from "@/components/layout/TopHeader";
import { SiteFooter } from "@/components/layout/Footer";

/**
 * 主页路由组（/blog, /projects, /life, /about, /tags/* ...）的共享布局
 *
 *  - 顶部 TopHeader：品牌 / 主导航 / 登录 / 主题切换
 *  - 内容区域全宽
 *  - 底部 SiteFooter：版权 / Powered by
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="vitalog-main-layout">
      <TopHeader />
      <div className="vitalog-main-layout__body">
        <div className="vitalog-main-layout__content">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}
