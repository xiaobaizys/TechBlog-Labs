import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConfigForm } from "./config-form";

// ============================================================
// 类型
// ============================================================

type ConfigData = Record<string, string>;

// 默认值（与 /api/admin/config 路由保持一致）
const DEFAULT_CONFIG: ConfigData = {
  site_title: "TechBlog Labs",
  site_description: "技术博客与创意实验室",
  seo_keywords: "技术博客,编程,Next.js,React",
  posts_per_page: "9",
  comments_per_page: "20",
  enable_comments: "true",
  enable_likes: "true",
};

// 直接用 Prisma 查 DB（避免服务端 fetch 自家 API 缺 cookie → 403）
async function getConfig(): Promise<ConfigData> {
  const dbConfigs = await prisma.systemConfig.findMany();
  const config: ConfigData = { ...DEFAULT_CONFIG };
  for (const item of dbConfigs) {
    config[item.key] = item.value;
  }
  return config;
}

export default async function AdminConfigPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  const config = await getConfig();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">系统配置</h1>
      <ConfigForm initialConfig={config} />
    </div>
  );
}
