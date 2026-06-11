/**
 * 一次性脚本：批量重置用户密码
 *
 * 用法：
 *   npx tsx scripts/reset-password.ts <email1> <email2> ... --password <newPassword>
 *   npx tsx scripts/reset-password.ts <email>:<password> <email2>:<password2> ...
 *
 * 例子：
 *   # 全部统一为 test123
 *   npx tsx scripts/reset-password.ts \
 *     2994460684@qq.com zys6606@qq.com zys6606@163.com \
 *     --password test123
 *
 *   # 每个邮箱不同密码
 *   npx tsx scripts/reset-password.ts \
 *     admin@techblog.com:admin123 \
 *     2994460684@qq.com:user123
 *
 *  - 默认会先打印要修改的内容 + 等待 5 秒或回车确认（避免误操作）
 *  - 加 --yes 跳过确认
 *  - 加 --help 看完整说明
 *
 * ⚠️ 仅供本地开发调试；生产环境请走"忘记密码"邮件流程，不要明文写脚本。
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

type Pair = { email: string; password: string };

const HELP = `
用法：
  npx tsx scripts/reset-password.ts <email...> --password <pwd> [--yes]
  npx tsx scripts/reset-password.ts <email>:<password> [<email>:<password> ...] [--yes]

选项：
  --password <pwd>   统一密码（与冒号语法互斥，但优先级低于冒号语法）
  --yes              跳过确认提示
  --help, -h         显示本帮助
`;

function parseArgs(argv: string[]): { pairs: Pair[]; yes: boolean; help: boolean } {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { pairs: [], yes: false, help: true };
  }

  const positional = argv.filter((a) => !a.startsWith("-"));
  const yes = argv.includes("--yes");

  // 1) 冒号语法：email:password
  const colonPairs: Pair[] = [];
  for (const arg of positional) {
    const idx = arg.indexOf(":");
    if (idx > 0 && idx < arg.length - 1) {
      colonPairs.push({ email: arg.slice(0, idx), password: arg.slice(idx + 1) });
    }
  }
  if (colonPairs.length > 0) {
    return { pairs: colonPairs, yes, help: false };
  }

  // 2) 位置 email + --password
  const pwdIdx = argv.indexOf("--password");
  const password = pwdIdx >= 0 ? argv[pwdIdx + 1] : undefined;
  if (!password) {
    console.error("\n❌ 错误：必须提供冒号语法（email:password）或 --password <pwd>\n");
    console.log(HELP);
    process.exit(2);
  }
  if (positional.length === 0) {
    console.error("\n❌ 错误：至少提供一个邮箱\n");
    console.log(HELP);
    process.exit(2);
  }
  if (password.length < 6) {
    console.error("\n❌ 错误：密码至少 6 个字符（与注册校验一致）\n");
    process.exit(2);
  }
  return {
    pairs: positional.map((email) => ({ email, password })),
    yes,
    help: false,
  };
}

async function main() {
  const { pairs, yes, help } = parseArgs(process.argv.slice(2));
  if (help) {
    console.log(HELP);
    return;
  }

  console.log("\n========== 密码重置预览 ==========");
  console.log("即将重置以下账号的密码：\n");
  for (const p of pairs) {
    console.log(`  · ${p.email.padEnd(30)} → ${p.password}`);
  }
  console.log("");

  if (!yes) {
    console.log("5 秒内按 Ctrl+C 取消；或按回车立即继续...\n");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        process.stdin.removeListener("data", onData);
        resolve();
      }, 5000);
      const onData = () => {
        clearTimeout(timer);
        process.stdin.removeListener("data", onData);
        resolve();
      };
      try {
        process.stdin.setRawMode?.(true);
        process.stdin.resume();
        process.stdin.once("data", onData);
      } catch {
        // 非交互终端（CI 等）— 走 5 秒倒计时
      }
    });
  }

  const prisma = new PrismaClient();
  const SALT_ROUNDS = 10;

  let okCount = 0;
  let failCount = 0;

  try {
    for (const { email, password } of pairs) {
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, role: true },
      });
      if (!existing) {
        console.log(`  ✗ ${email.padEnd(30)} 账号不存在，跳过`);
        failCount++;
        continue;
      }

      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      await prisma.user.update({
        where: { email },
        data: { hashedPassword: hashed },
      });
      console.log(
        `  ✓ ${email.padEnd(30)} (${existing.role}) 重置成功  指纹 ${hashed.slice(0, 10)}...`
      );
      okCount++;
    }
  } catch (e) {
    console.error("\n[RESET ERROR]", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n========== 完成：成功 ${okCount}，失败 ${failCount} ==========\n`);

  if (okCount > 0) {
    console.log("📋 请记录新密码：");
    for (const p of pairs) console.log(`   ${p.email.padEnd(30)} ${p.password}`);
    console.log("");
  }
}

main().catch((e) => {
  console.error("[UNCAUGHT]", e);
  process.exit(1);
});
