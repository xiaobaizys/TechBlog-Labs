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
  {
    key: "DATABASE_URL",
    description: "数据库连接串（PostgreSQL）",
    example: "postgresql://user:password@localhost:5432/techblog",
  },
];

const OPTIONAL_VARS: VarCheck[] = [
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
    tip: "在 https://platform.deepseek.com 获取",
  },
  {
    key: "REDIS_URL",
    description: "Redis 连接 URL（可选，用于缓存加速）",
    example: "redis://localhost:6379",
    tip: "不配置时使用内存缓存，配置后可实现跨进程缓存共享",
  },
  {
    key: "NEXT_PUBLIC_SITE_URL",
    description: "站点公开 URL（用于 RSS、Sitemap 等）",
    example: "https://your-domain.com",
    tip: "用于生成绝对 URL，RSS Feed 和 Sitemap 需要",
  },
  {
    key: "SENTRY_DSN",
    description: "Sentry DSN（可选，用于错误监控）",
    tip: "在 https://sentry.io 获取，用于生产环境错误追踪",
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
