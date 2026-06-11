/**
 * 一次性脚本：用 bcrypt 比对若干 (email, expected) 期望，验证数据库里的哈希确实匹配
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const cases = [
    { email: "admin@techblog.com", expected: "admin123" },
    { email: "2994460684@qq.com", expected: "test123" },
    { email: "zys6606@qq.com", expected: "test123" },
    { email: "zys6606@163.com", expected: "test123" },
  ];

  console.log("\n=== 密码哈希验证 ===\n");
  for (const c of cases) {
    const u = await prisma.user.findUnique({
      where: { email: c.email },
      select: { hashedPassword: true },
    });
    const ok = u?.hashedPassword
      ? await bcrypt.compare(c.expected, u.hashedPassword)
      : false;
    console.log(
      `${ok ? "✓" : "✗"}  ${c.email.padEnd(28)}  期望密码 = ${c.expected}`
    );
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
