/**
 * 一次性脚本：列出所有用户（管理员 / 调试用）
 *
 *  - 不输出明文密码（数据库里也没有明文密码）
 *  - hashedPassword 只显示前 8 字符 + "..."，确认存在性
 *  - 如果需要重置某个用户的密码，可使用：npm run db:reset-password -- <email> <newPassword>
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      image: true,
      hashedPassword: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          lifePosts: true,
          comments: true,
        },
      },
    },
  });

  console.log(`\n=== 共 ${users.length} 个用户 ===\n`);

  if (users.length === 0) {
    console.log("（空）\n");
    return;
  }

  // 表头
  const header = [
    "ID".padEnd(22),
    "EMAIL".padEnd(32),
    "NAME".padEnd(20),
    "ROLE".padEnd(8),
    "PWD".padEnd(5),
    "VERIFIED".padEnd(8),
    "POSTS".padStart(4),
    "LIFE".padStart(4),
    "COMMENTS".padStart(4),
    "JOINED",
  ].join("  ");
  console.log(header);
  console.log("─".repeat(header.length));

  for (const u of users) {
    const pwdIndicator = u.hashedPassword
      ? u.hashedPassword.startsWith("$2") // bcrypt 始终 $2a$ / $2b$ / $2y$ 开头
        ? "✓"
        : "?"
      : "—"; // GitHub 登录用户没有 hashedPassword

    const verified = u.emailVerified
      ? new Date(u.emailVerified).toISOString().slice(0, 10)
      : "—";

    const joined = u.createdAt.toISOString().slice(0, 19).replace("T", " ");

    console.log(
      [
        u.id.padEnd(22),
        (u.email ?? "—").padEnd(32),
        (u.name ?? "—").padEnd(20),
        u.role.padEnd(8),
        pwdIndicator.padEnd(5),
        verified.padEnd(8),
        String(u._count.posts).padStart(4),
        String(u._count.lifePosts).padStart(4),
        String(u._count.comments).padStart(4),
        joined,
      ].join("  ")
    );
  }

  // 详细输出（含每个用户的哈希指纹，方便核对）
  console.log("\n=== 密码哈希指纹（前 8 字符）===");
  for (const u of users) {
    if (!u.hashedPassword) {
      console.log(`  ${u.email ?? u.id}  →  无（GitHub 登录）`);
      continue;
    }
    // 提取 $2b$10$... 中的算法 + cost 参数（说明哈希是 bcrypt 哪一档）
    const algo = u.hashedPassword.slice(0, 7); // $2a$10$
    const fingerprint = u.hashedPassword.slice(0, 10);
    console.log(`  ${u.email ?? u.id}  →  ${algo}... (${fingerprint}...)`);
  }

  console.log("\n");
}

main()
  .catch((e) => {
    console.error("[USER LIST ERROR]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
