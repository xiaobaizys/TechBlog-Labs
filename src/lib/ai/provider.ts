/**
 * AI 提供商管理工具
 *
 * 从数据库读取活跃的 AI 提供商配置，
 * 供 embeddings.ts 中的 callDeepSeek / streamDeepSeek 使用。
 */

import { prisma } from "@/lib/prisma";

export type AiProviderConfig = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

/**
 * 获取当前启用的 AI 提供商
 *  - 先查 DB 中 isActive = true 的（管理员可在后台增删改查、切换）
 *  - 如果没有，回退到环境变量 DEEPSEEK_API_KEY（兼容旧配置和本地开发）
 */
export async function getActiveAiProvider(): Promise<AiProviderConfig | null> {
  // 优先使用数据库中的活跃提供商（管理员可在后台自由切换）
  try {
    const provider = await prisma.aiProvider.findFirst({
      where: { isActive: true },
    });
    if (provider) {
      return {
        id: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        model: provider.model,
      };
    }
  } catch {
    // DB 不可用时静默降级
  }

  // 降级：使用环境变量
  const envKey = process.env.DEEPSEEK_API_KEY;
  if (envKey && envKey !== "sk-placeholder") {
    return {
      id: "env",
      name: "DeepSeek (环境变量)",
      baseUrl: "https://api.deepseek.com",
      apiKey: envKey,
      model: "deepseek-chat",
    };
  }

  return null;
}