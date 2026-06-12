import { requireAdmin } from "@/lib/auth/requireAdmin";
import { AiKeysClient } from "./ai-keys-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI 提供商管理",
  robots: { index: false, follow: false },
};

export default async function AiKeysPage() {
  await requireAdmin();
  return <AiKeysClient />;
}