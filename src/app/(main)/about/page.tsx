import { AboutPanel } from "@/components/shared/AboutPanel";
import { ContactBlock } from "@/components/shared/ContactBlock";

/**
 * 关于页 / 联系页
 *
 *  - 上半部分：AboutPanel（个人信息 / 头像 / 技能 / 社交链接）
 *  - 下半部分：ContactBlock（保持联系，CTA 群 + 社交）
 */
export const metadata = {
  title: "关于 · VitaLog",
  description: "关于我、保持联系的方式以及一切你想知道的。",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 md:px-10 lg:px-20 py-16">
      {/* 页面标题 */}
      <div className="mb-12">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-bright/80 font-mono mb-3 flex items-center gap-3">
          <span className="inline-block w-8 h-px bg-amber-bright/60" />
          — About
        </p>
        <h1 className="text-3xl md:text-5xl font-serif font-medium tracking-tight text-foreground leading-[1.1]">
          关于
          <span className="italic text-amber-bright"> 我 </span>
        </h1>
        <p className="mt-3 text-muted-foreground text-sm md:text-base">
          一个全栈开发者 / 内容创作者 · 在这里记录思考与生活
        </p>
      </div>

      {/* 上半：关于面板（从首页迁入） */}
      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 md:p-10 shadow-sm">
        <AboutPanel showHeading={false} />
      </section>

      {/* 下半：保持联系（从首页迁入） */}
      <ContactBlock asSection={false} className="mt-24" />
    </div>
  );
}
