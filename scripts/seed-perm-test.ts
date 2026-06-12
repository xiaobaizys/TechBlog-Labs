/**
 * 一次性脚本：插入用于「私密分享权限测试」的模拟数据
 *
 * 用法：
 *   npx tsx scripts/seed-perm-test.ts --force
 *
 * 数据：
 *   - 普通用户 perm-test-user@techblog.com / PermTest123  (USER 角色)
 *     · 1 条公开分享
 *     · 1 条私密分享
 *   - 现有 admin 账号（admin@techblog.com）不动
 *
 * Idempotent：账号/分享已存在则只更新，不重复插入。
 *
 * ⚠️ 仅供本地开发调试。
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const TEST_USER_EMAIL = "perm-test-user@techblog.com";
const TEST_USER_NAME = "PermTester";
const TEST_USER_PASSWORD = "PermTest123";
const SALT_ROUNDS = 10;

const HELP = `
用法：
  npx tsx scripts/seed-perm-test.ts [--force]

说明：
  创建/重置一个用于测试私密分享权限的普通用户：
    email = ${TEST_USER_EMAIL}
    name  = ${TEST_USER_NAME}
    role  = USER
    pwd   = ${TEST_USER_PASSWORD}

  并为该用户创建：
    · 1 条公开分享（isPublic = true）
    · 1 条私密分享（isPublic = false）
`;

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }
  const force = args.includes("--force");

  console.log("\n========== 私密分享权限测试数据 Seed ==========");
  console.log(`  email : ${TEST_USER_EMAIL}`);
  console.log(`  name  : ${TEST_USER_NAME}`);
  console.log(`  role  : USER`);
  console.log(`  pwd   : ${TEST_USER_PASSWORD}`);
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
        // 非交互终端走 5 秒倒计时
      }
    });
  }

  const prisma = new PrismaClient();
  const hashed = await bcrypt.hash(TEST_USER_PASSWORD, SALT_ROUNDS);

  try {
    // ---------- 1. 创建/重置测试用户 ----------
    const existingUser = await prisma.user.findUnique({
      where: { email: TEST_USER_EMAIL },
      select: { id: true },
    });

    let userId: string;
    if (existingUser) {
      await prisma.user.update({
        where: { email: TEST_USER_EMAIL },
        data: {
          name: TEST_USER_NAME,
          hashedPassword: hashed,
          role: "USER",
          emailVerified: new Date(),
        },
      });
      userId = existingUser.id;
      console.log(`  ✓ 测试用户已存在 → 重置（id=${userId}）`);
    } else {
      const created = await prisma.user.create({
        data: {
          email: TEST_USER_EMAIL,
          name: TEST_USER_NAME,
          hashedPassword: hashed,
          role: "USER",
          emailVerified: new Date(),
        },
        select: { id: true },
      });
      userId = created.id;
      console.log(`  ✓ 新建测试用户（id=${userId}）`);
    }

    // ---------- 2. 清理旧的测试分享 ----------
    const deleted = await prisma.lifePost.deleteMany({
      where: { authorId: userId },
    });
    console.log(`  ✗ 清理该用户历史分享 ${deleted.count} 条`);

    // ---------- 3. 创建公开分享 ----------
    const publicPost = await prisma.lifePost.create({
      data: {
        authorId: userId,
        content: "[公开测试帖] 这是一段对外公开的内容，所有登录/未登录用户都能看到。",
        images: [],
        isPublic: true,
      },
      select: { id: true, isPublic: true },
    });
    console.log(`  ✓ 公开分享 id=${publicPost.id} (isPublic=${publicPost.isPublic})`);

    // ---------- 4. 创建私密分享 ----------
    const privatePost = await prisma.lifePost.create({
      data: {
        authorId: userId,
        content: "[私密测试帖] 这是只给作者本人看的内容，管理员也不应该能查看/编辑/删除。",
        images: [],
        isPublic: false,
      },
      select: { id: true, isPublic: true },
    });
    console.log(`  ✓ 私密分享 id=${privatePost.id} (isPublic=${privatePost.isPublic})`);

    // ---------- 5. 汇总 ----------
    console.log("\n========== 完成 ==========");
    console.log("\n📋 测试凭据：\n");
    console.log(`   普通用户：${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD}  (USER)`);
    console.log(`   管理员：  admin@techblog.com / Admin123  (ADMIN)\n`);
    console.log(`📋 测试分享 ID：\n`);
    console.log(`   公开分享：${publicPost.id}`);
    console.log(`   私密分享：${privatePost.id}\n`);
    console.log(`📋 预期结果矩阵：\n`);
    console.log("   角色      | 查看公开 | 查看私密 | 编辑私密 | 删除私密");
    console.log("   ----------+----------+----------+----------+----------");
    console.log("   访客      |   200    |   404    |   403    |   403");
    console.log("   普通用户  |   200    |   404    |   403    |   403");
    console.log("   管理员    |   200    |   404    |   403    |   403");
    console.log("   作者本人  |   200    |   200    |   200    |   200");
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
