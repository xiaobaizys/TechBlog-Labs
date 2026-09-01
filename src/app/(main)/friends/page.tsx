import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Globe, Users, Send } from "lucide-react";
import { FriendLinkApplyForm } from "./apply-form";
import { FriendLinksByCategory } from "./friend-links-by-category";

/**
 * 友情链接页面
 *
 * 功能：
 * - 按分类展示所有启用的友情链接
 * - 支持点击跳转到外部链接
 * - 友链申请表单
 */

export const metadata = {
  title: "友情链接",
  description: "友情链接 - 推荐的网站和博客",
};

// 类型定义
interface FriendLink {
  id: string;
  name: string;
  url: string;
  avatar: string | null;
  favicon: string | null;
  description: string | null;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 获取友情链接数据
async function getFriendLinks(): Promise<{
  links: FriendLink[];
  categories: string[];
}> {
  try {
    const links = await prisma.friendLink.findMany({
      where: { isActive: true, status: "APPROVED" },
      orderBy: { sortOrder: "asc" },
    });

    // 获取所有分类
    const categorySet = new Set(links.map((l) => l.category).filter(Boolean));
    const categories = Array.from(categorySet) as string[];

    return { links, categories };
  } catch (error) {
    console.error("[getFriendLinks]", error);
    return { links: [], categories: [] };
  }
}

// 主页面组件
export default async function FriendsPage() {
  const { links, categories } = await getFriendLinks();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      {/* 页面标题 */}
      <header className="mb-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <Users className="h-8 w-8 text-amber-bright" />
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            友情链接
          </h1>
        </div>
        <p className="text-[rgb(var(--muted-foreground))]">
          推荐的网站和博客，欢迎交换友情链接
        </p>
      </header>

      {/* 友情链接列表（按分类） */}
      {links.length > 0 ? (
        <FriendLinksByCategory links={links} categories={categories} />
      ) : (
        <div className="rounded-xl border border-dashed border-[rgb(var(--border))] p-12 text-center">
          <Globe className="mx-auto mb-4 h-12 w-12 text-[rgb(var(--muted-foreground))]" />
          <h3 className="mb-2 text-lg font-medium">暂无友情链接</h3>
          <p className="text-[rgb(var(--muted-foreground))]">
            还没有添加任何友情链接
          </p>
        </div>
      )}

      {/* 申请友情链接 */}
      <div className="mt-12">
        <FriendLinkApplyForm />
      </div>
    </div>
  );
}
