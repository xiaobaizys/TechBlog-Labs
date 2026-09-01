import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import RSS from "rss";

/**
 * GET /rss.xml — 生成 RSS 订阅源
 *
 * 输出符合 RSS 2.0 规范的 XML 文件
 * 包含已发布的博客文章（标题、链接、描述、发布日期、作者）
 */
export async function GET() {
  try {
    // 获取站点配置
    const siteTitle = "生息日志 / VitaLog";
    const siteDescription = "技术博客与创意实验室";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // 创建 RSS 实例
    const feed = new RSS({
      title: siteTitle,
      description: siteDescription,
      feed_url: `${siteUrl}/rss.xml`,
      site_url: siteUrl,
      language: "zh-CN",
      pubDate: new Date(),
      ttl: 60, // 缓存时间（分钟）
      custom_namespaces: {
        content: "http://purl.org/rss/1.0/modules/content/",
        media: "http://search.yahoo.com/mrss/",
      },
    });

    // 从数据库获取已发布的文章
    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        publishedAt: true,
        createdAt: true,
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 20, // 只返回最新 20 篇文章
    });

    // 添加文章到 RSS
    posts.forEach((post) => {
      // 获取文章摘要：优先使用 excerpt，没有则截取 content 前 200 字
      let description = post.excerpt;
      if (!description) {
        // 移除 Markdown 格式，截取前 200 字
        const plainText = post.content
          .replace(/#{1,6}\s+/g, "") // 移除标题标记
          .replace(/\*\*(.*?)\*\*/g, "$1") // 移除加粗
          .replace(/\*(.*?)\*/g, "$1") // 移除斜体
          .replace(/\[(.*?)\]\(.*?\)/g, "$1") // 移除链接，保留文本
          .replace(/!\[.*?\]\(.*?\)/g, "") // 移除图片
          .replace(/`{1,3}[^`]*`{1,3}/g, "") // 移除代码块
          .replace(/\n+/g, " ") // 换行替换为空格
          .trim();

        description =
          plainText.length > 200
            ? plainText.substring(0, 200) + "..."
            : plainText;
      }

      // 获取标签
      const categories = post.tags.map((t) => t.tag.name);

      // 发布日期
      const pubDate = post.publishedAt || post.createdAt;

      // 添加到 RSS
      feed.item({
        title: post.title,
        description: description,
        url: `${siteUrl}/blog/${post.slug}`,
        guid: post.id,
        categories: categories,
        author: post.author.name || "匿名",
        date: pubDate,
        custom_elements: [
          {
            "content:encoded": `<![CDATA[<p>${description}</p><p><a href="${siteUrl}/blog/${post.slug}">阅读全文</a></p>]]>`,
          },
        ],
      });
    });

    // 生成 XML
    const xml = feed.xml({ indent: true });

    // 返回 XML 响应
    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("[GET /rss.xml]", error);

    // 返回错误响应
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>生息日志 / VitaLog</title>
    <description>技术博客与创意实验室</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <item>
      <title>暂时无法获取文章</title>
      <description>请稍后再试</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`,
      {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      }
    );
  }
}
