/**
 * 环境变量检查 — 在应用启动时调用
 *
 * 自动检查关键环境变量是否配置，缺失时打印警告。
 * 不阻止应用启动，仅提供清晰的日志提示。
 */

interface VarCheck {
  key: string;
  description: string;
  generate?: string;
  example?: string;
  tip?: string;
}

const REQUIRED_VARS: VarCheck[] = [
  {
    key: "NEXTAUTH_SECRET",
    description: "NextAuth 密钥",
    generate: "openssl rand -base64 32",
  },
  {
    key: "NEXTAUTH_URL",
    description: "NextAuth 站点 URL",
    example: "http://localhost:3000",
  },
];

const OPTIONAL_VARS: VarCheck[] = [
  {
    key: "DATABASE_URL",
    description: "数据库连接串",
  },
  {
    key: "AUTH_GITHUB_ID",
    description: "GitHub OAuth Client ID（可选，用于 GitHub 登录）",
    tip: "在 https://github.com/settings/developers 创建 OAuth App",
  },
  {
    key: "AUTH_GITHUB_SECRET",
    description: "GitHub OAuth Client Secret",
  },
  {
    key: "DEEPSEEK_API_KEY",
    description: "DeepSeek AI API Key（可选，用于 AI 功能）",
  },
];

export function checkEnv(): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];

  // 检查必需变量
  for (const { key, description, generate, example } of REQUIRED_VARS) {
    if (!process.env[key]) {
      let msg = `[MISSING] ${key} — ${description}\n`;
      if (generate) msg += `  生成方式: ${generate}\n`;
      if (example) msg += `  示例值: ${example}\n`;
      issues.push(msg);
    }
  }

  // 检查可选变量
  for (const { key, description } of OPTIONAL_VARS) {
    if (!process.env[key]) {
      warnings.push(`[WARN] ${key} 未设置 — ${description}`);
    }
  }

  // 输出
  if (issues.length > 0) {
    console.warn("\n⚠️  环境变量缺失:\n" + issues.join("\n"));
  }
  if (warnings.length > 0) {
    console.info("\n💡 可选环境变量未配置:\n" + warnings.join("\n"));
  }
  if (issues.length === 0 && warnings.length === 0) {
    console.info("✅ 环境变量检查通过");
  }

  return {
    ok: issues.length === 0,
    issues: [...issues, ...warnings],
  };
}
