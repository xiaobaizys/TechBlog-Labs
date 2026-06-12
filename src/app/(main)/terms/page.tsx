import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "服务条款 · 生息日志",
  description: "生息日志 VitaLog 服务条款。",
};

/**
 * 服务条款页
 */
export default function TermsPage() {
  return (
    <main className="vitalog-page vitalog-page--narrow">
      <div className="vitalog-page__back">
        <Link href="/" className="vitalog-page__back-link" data-cursor="hover">
          <ArrowLeft className="vitalog-page__back-icon" aria-hidden />
          <span>回到首页</span>
        </Link>
      </div>

      <header className="vitalog-page__header">
        <p className="vitalog-page__eyebrow">TERMS · 服务条款</p>
        <h1 className="vitalog-page__title">服务条款</h1>
        <p className="vitalog-page__sub">
          最近更新：{new Date().toLocaleDateString("zh-CN")}
        </p>
      </header>

      <article className="vitalog-page__body">
        <section>
          <h2>一、总则</h2>
          <p>
            欢迎使用<strong>生息日志（VitaLog）</strong>。本平台为个人博客站点，
            致力于提供优质的内容阅读与交流环境。访问或使用本站即表示你同意
            以下条款。
          </p>
        </section>

        <section>
          <h2>二、账号与注册</h2>
          <p>
            部分功能（如评论、留言）需要注册账号。你应提供真实、准确的信息，
            并对账号下的所有行为负责。如发现违规使用，我们有权暂停或终止你的账号。
          </p>
        </section>

        <section>
          <h2>三、用户行为</h2>
          <p>使用本站服务时，你同意不会：</p>
          <ul>
            <li>发布违法、骚扰、诽谤或侵犯他人权益的内容</li>
            <li>利用自动化工具刷取评论、点赞或进行其他滥用行为</li>
            <li>试图破坏网站安全或干扰正常运营</li>
          </ul>
        </section>

        <section>
          <h2>四、内容所有权</h2>
          <p>
            你发布的内容（评论、留言等）版权归你所有。但你授予本站非独占的、
            免费的许可，允许我们在平台上展示、传播这些内容。
          </p>
          <p>
            本站原创文章版权归作者所有，未经许可不得转载或用于商业用途。
          </p>
        </section>

        <section>
          <h2>五、免责声明</h2>
          <p>
            本站内容仅供学习交流，不构成任何专业建议。我们尽力确保内容准确，
            但不保证信息的完整性、及时性或适用性。使用本站产生的风险由你自行承担。
          </p>
        </section>

        <section>
          <h2>六、条款修改</h2>
          <p>
            我们可能不时更新本条款。修改后的条款自发布之日起生效。
            继续使用本站即视为接受修改后的条款。
          </p>
        </section>
      </article>

      <footer className="vitalog-page__foot">
        <p>© {new Date().getFullYear()} 生息日志 / VitaLog</p>
      </footer>
    </main>
  );
}