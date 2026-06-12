import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const r = await p.lifePost.findMany({ select: { id: true, isPublic: true, authorId: true, content: true } });
  console.log("count:", r.length);
  r.forEach((x) => console.log({ id: x.id, isPublic: x.isPublic, author: x.authorId.slice(0, 10), content: x.content.slice(0, 30) }));
}
main().finally(() => p.$disconnect());
