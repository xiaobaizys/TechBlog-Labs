/**
 * 一次性脚本：插入 / 重置固定管理员账号
 *
 * 用法：
 *   npx tsx scripts/seed-admin.ts            # 走默认（idempotent：存在就重置，不存在就创建）
 *   npx tsx scripts/seed-admin.ts --force    # 跳过确认直接执行
 *
 * 固定账号：
 *   - 邮箱：admin@techblog.local
 *   - 用户名：Admin
 *   - 密码：Admin123
 *   - 角色：ADMIN
 *   - 邮箱已验证：是
 *
 * Idempotent：
 *   - 邮箱已存在 → 重置密码 + 把 name 同步成 Admin + role 提升为 ADMIN（如果原来不是）
 *   - 邮箱不存在 → 创建新账号
 *
 * ⚠️ 仅供本地开发调试；生产环境请删除此脚本。
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL = "admin@techblog.com";
const ADMIN_NAME = "Admin";
const ADMIN_PASSWORD = "Admin123";
const SALT_ROUNDS = 10;

const HELP = `
用法：
  npx tsx scripts/seed-admin.ts [--force]

说明：
  创建/重置固定管理员账号：
    email = ${ADMIN_EMAIL}
    name  = ${ADMIN_NAME}
    role  = ADMIN
    pwd   = ${ADMIN_PASSWORD}

  - 邮箱已存在 → 重置密码 + name/role 同步
  - 邮箱不存在 → 全新创建

  加 --force 跳过 5 秒确认倒计时。
`;

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }
  const force = args.includes("--force");

  console.log("\n========== 固定管理员 Seed ==========");
  console.log(`  email : ${ADMIN_EMAIL}`);
  console.log(`  name  : ${ADMIN_NAME}`);
  console.log(`  role  : ADMIN`);
  console.log(`  pwd   : ${ADMIN_PASSWORD}`);
  console.log("");

  if (!force) {
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
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

  try {
    // 清理之前 seed-admin 用错邮箱（.local）误建的账号（如有）
    const wrong = await prisma.user.findUnique({
      where: { email: "admin@techblog.local" },
      select: { id: true },
    });
    if (wrong) {
      await prisma.user.delete({ where: { email: "admin@techblog.local" } });
      console.log(`  ✗ 清理误建账号 admin@techblog.local (id=${wrong.id})`);
    }

    const existing = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { id: true, name: true, role: true },
    });

    if (existing) {
      // 已存在 → 升级 / 重置
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          name: ADMIN_NAME,
          hashedPassword: hashed,
          role: "ADMIN",
          emailVerified: new Date(),
        },
      });
      console.log(`  ✓ 账号已存在（id=${existing.id}，原 name=${existing.name ?? "<空>"}，原 role=${existing.role}）`);
      console.log(`  → 已重置为 name=${ADMIN_NAME}，role=ADMIN，password=${ADMIN_PASSWORD}`);
    } else {
      // 不存在 → 创建
      const created = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          name: ADMIN_NAME,
          hashedPassword: hashed,
          role: "ADMIN",
          emailVerified: new Date(),
        },
        select: { id: true, email: true, name: true, role: true },
      });
      console.log(`  ✓ 新建管理员成功`);
      console.log(`    id    : ${created.id}`);
      console.log(`    email : ${created.email}`);
      console.log(`    name  : ${created.name}`);
      console.log(`    role  : ${created.role}`);
    }

    console.log(`\n========== 完成 ==========`);
    console.log(`\n📋 登录凭据：\n   邮箱：${ADMIN_EMAIL}\n   用户名：${ADMIN_NAME}\n   密码：${ADMIN_PASSWORD}\n`);
  } catch (e) {
    console.error("\n[SEED ERROR]", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[UNCAUGHT]", e);
  process.exit(1);
});
