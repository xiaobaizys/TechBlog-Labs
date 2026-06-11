/**
 * 文章向量化脚本
 *
 * 将所有已发布且未索引的文章切分并存入 PostChunk 表。
 * 用于 RAG 系统的文本检索。
 *
 * 用法:
 *   npx tsx scripts/embed-posts.ts
 * 或添加到 package.json:
 *   "embed": "npx tsx scripts/embed-posts.ts"
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function chunkText(text: string, maxLength: number = 800): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if ((current + "\n\n" + trimmed).length > maxLength && current) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? current + "\n\n" + trimmed : trimmed;
    }

    while (current.length > maxLength * 1.5) {
      const splitPoint = current.lastIndexOf("\n", maxLength);
      const cutAt = splitPoint > maxLength / 2 ? splitPoint : maxLength;
      chunks.push(current.slice(0, cutAt).trim());
      current = current.slice(cutAt).trim();
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function main() {
  console.log("🔍 查找需要索引的文章...\n");

  // 查找已发布且没有切片的文章
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: { id: true, title: true, content: true },
  });

  console.log(`找到 ${posts.length} 篇已发布文章\n`);

  let totalChunks = 0;

  for (const post of posts) {
    // 删除旧切片
    await prisma.postChunk.deleteMany({ where: { postId: post.id } });

    const chunks = chunkText(post.content, 800);
    console.log(`  📄 "${post.title}" → ${chunks.length} 个切片`);

    for (let i = 0; i < chunks.length; i++) {
      await prisma.postChunk.create({
        data: {
          postId: post.id,
          chunkIndex: i,
          content: chunks[i],
        },
      });
    }

    totalChunks += chunks.length;
  }

  console.log(`\n✅ 完成！共创建 ${totalChunks} 个切片\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ 错误:", err);
  prisma.$disconnect();
  process.exit(1);
});
