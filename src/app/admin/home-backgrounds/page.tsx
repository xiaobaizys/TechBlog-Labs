import { requireAdmin } from "@/lib/auth/requireAdmin";
import { HomeBgClient } from "./home-bg-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "首页背景管理",
  robots: { index: false, follow: false },
};

export default async function HomeBackgroundsPage() {
  await requireAdmin();
  return <HomeBgClient />;
}