/**
 * 自托管 cron：每日回填 DailyStats
 *
 * 用法：
 *   - 部署到 Vercel：直接用 vercel.json 中配置的 cron
 *   - 自托管：node-cron / systemd-timer / GitHub Actions 周期调用
 *     npx tsx scripts/cron-rebuild-daily.ts [--days N]
 *
 * 触发：
 *   POST {APP_URL}/api/admin/stats/rebuild-daily?days=N
 *   Header: x-cron-secret: $CRON_SECRET
 */

import "dotenv/config";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

const args = process.argv.slice(2);
let days = 7;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--days" && args[i + 1]) {
    const n = parseInt(args[i + 1], 10);
    if (Number.isFinite(n) && n > 0) days = n;
    i += 1;
  }
}

async function main() {
  if (!CRON_SECRET) {
    console.error("❌ CRON_SECRET 未设置，无法调用 /api/admin/stats/rebuild-daily");
    process.exit(1);
  }
  const url = `${APP_URL}/api/admin/stats/rebuild-daily?days=${days}`;
  console.log(`[cron] POST ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-cron-secret": CRON_SECRET },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`❌ HTTP ${res.status}: ${text}`);
    process.exit(1);
  }
  console.log(`✅ ${text}`);
}

main().catch((err) => {
  console.error("❌ 异常:", err);
  process.exit(1);
});
