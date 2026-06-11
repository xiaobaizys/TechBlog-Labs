import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "隐私政策 · 生息日志",
  description: "生息日志 VitaLog 隐私政策与开源说明。",
};

/**
 * 隐私政策页
 *
 *  - 信息架构保持极简，与站点的「十二时辰」叙事一致
 *  - 正文用衬线字体，提升阅读仪式感
 */
export default function PrivacyPage() {
  return (
    <main className="vitalog-page vitalog-page--narrow">
      <div className="vitalog-page__back">
        <Link href="/" className="vitalog-page__back-link" data-cursor="hover">
          <ArrowLeft className="vitalog-page__back-icon" aria-hidden />
          <span>回到首页</span>
        </Link>
      </div>

      <header className="vitalog-page__header">
        <p className="vitalog-page__eyebrow">PRIVACY · 隐私政策</p>
        <h1 className="vitalog-page__title">隐私政策</h1>
        <p className="vitalog-page__sub">
          最近更新：{new Date().toLocaleDateString("zh-CN")}
        </p>
      </header>

      <article className="vitalog-page__body">
        <section>
          <h2>一、概述</h2>
          <p>
            欢迎访问<strong>生息日志（VitaLog）</strong>。本站致力于为读者提供
            安静、纯粹的阅读与记录体验。我们尊重并保护每一位访客的隐私，
            本页面说明本站如何收集、使用与保护你的信息。
          </p>
        </section>

        <section>
          <h2>二、信息收集</h2>
          <p>
            本站为静态展示为主的内容站点，正常浏览不会主动要求你提供
            个人信息；当你主动留言、订阅或联系作者时，我们会仅收集
            你所填写的内容（如昵称、邮箱），用于回复或发送通知，
            不会用于其他用途。
          </p>
        </section>

        <section>
          <h2>三、Cookie 与统计</h2>
          <p>
            本站可能使用必要的 Cookie
            以维持登录状态等基础功能；如启用第三方统计，
            统计数据将以匿名聚合形式呈现，不包含可识别个人身份的信息。
          </p>
        </section>

        <section>
          <h2>四、开源说明</h2>
          <p>
            本项目开源免费，源代码以 MIT 协议开放，欢迎学习、二次开发
            与非商业用途的引用。
          </p>
          <p>
            本站由{" "}
            <a
              href="https://taozhiyy.top/"
              target="_blank"
              rel="noopener noreferrer"
              className="vitalog-page__inline-link"
            >
              逃之夭夭
            </a>{" "}
            与{" "}
            <a
              href="https://www.bilibili.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="vitalog-page__inline-link"
            >
              哔哩哔哩
            </a>{" "}
            提供支持，感谢他们提供的工具、灵感与社区。
          </p>
        </section>

        <section>
          <h2>五、联系</h2>
          <p>
            如对隐私政策有任何疑问，可通过页脚的邮箱或社交账号与我们联系。
          </p>
        </section>
      </article>

      <footer className="vitalog-page__foot">
        <p>© {new Date().getFullYear()} 生息日志 / VitaLog</p>
      </footer>
    </main>
  );
}
