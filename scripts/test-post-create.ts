import { prisma } from '@/lib/prisma';
import { revalidatePosts } from '@/lib/cache';

async function testCreatePost() {
  console.log('=== 测试发布文章功能 ===');
  
  // 查找管理员用户
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true, name: true, email: true },
  });
  
  if (!admin) {
    console.error('❌ 未找到管理员用户');
    return;
  }
  
  console.log(`📋 使用管理员用户: ${admin.name} (${admin.email})`);
  
  // 创建测试文章
  try {
    const post = await prisma.post.create({
      data: {
        title: '测试文章 - ' + new Date().toISOString(),
        slug: 'test-post-' + Date.now(),
        content: `# 测试文章内容

这是一篇用于测试发布功能的文章。

## 章节一

- 列表项 1
- 列表项 2
- 列表项 3

## 代码示例

\`\`\`javascript
console.log('Hello, World!');
\`\`\``,
        excerpt: '这是测试文章的摘要',
        status: 'PUBLISHED',
        featured: false,
        authorId: admin.id,
        publishedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    });
    
    console.log('✅ 文章创建成功!');
    console.log(JSON.stringify(post, null, 2));
    
    // 验证文章是否存在
    const verify = await prisma.post.findUnique({
      where: { id: post.id },
      select: { id: true, title: true, status: true },
    });
    
    if (verify) {
      console.log('✅ 文章验证成功!');
    } else {
      console.error('❌ 文章验证失败!');
    }
    
    // 清理测试数据
    await prisma.post.delete({ where: { id: post.id } });
    console.log('🗑️ 测试数据已清理');
    
  } catch (error) {
    console.error('❌ 创建文章失败:', error);
  }
}

testCreatePost().then(() => process.exit());
