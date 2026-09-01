import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://techblog-labs.vercel.app";

  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/projects`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/life`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  // �态博客文章
  const posts = await prisma.post.findMany({
    where: { published: true, status: "PUBLISHED", deletedAt: null },
    select: { slug: true, updatedAt: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // 动态项目页面
  const projects = await prisma.project.findMany({
    where: { isPublic: true },
    select: { slug: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });

  const projectPages: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${baseUrl}/projects/${project.slug}`,
    lastModified: project.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // 标签页面
  const tags = await prisma.tag.findMany({
    select: { slug: true },
  });

  const tagPages: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${baseUrl}/blog?tag=${tag.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...postPages, ...projectPages, ...tagPages];
}
