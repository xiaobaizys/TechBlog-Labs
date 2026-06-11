import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import { getConfig } from "@/lib/config";
import { Providers } from "./providers";
import { AIChatButton } from "@/components/ai/AIChatButton";
import { Starfield } from "@/components/ui/Starfield";
import { Atmosphere } from "@/components/ui/Atmosphere";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

/**
 * 动态生成 metadata — 从数据库读取站点标题和描述
 */
export async function generateMetadata(): Promise<Metadata> {
  let siteTitle = "VitaLog · 生息日志";
  let siteDescription = "技术博客与创意实验室";
  let seoKeywords = "技术博客,编程,Next.js,React";

  try {
    siteTitle = await getConfig("site_title");
    siteDescription = await getConfig("site_description");
    seoKeywords = await getConfig("seo_keywords");
  } catch {
    // 数据库不可达时使用默认值
  }

  return {
    title: {
      default: siteTitle,
      template: `%s | ${siteTitle}`,
    },
    description: siteDescription,
    keywords: seoKeywords.split(",").map((k) => k.trim()).filter(Boolean),
    authors: [{ name: siteTitle }],
    metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName: siteTitle,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground relative overflow-x-hidden transition-colors duration-300">
        {/* 氛围层：星空画布 + 银河/城市/山脉（仅 dark 模式显示） */}
        <Starfield />
        <Atmosphere />
        {/* 业务内容置于氛围层之上 */}
        <div className="relative z-10 flex flex-col flex-1">
          <Providers>
            {children}
            {/* AIChatButton 必须放在 Providers 内：内部用到 useSession() */}
            <AIChatButton />
          </Providers>
        </div>
      </body>
    </html>
  );
}
