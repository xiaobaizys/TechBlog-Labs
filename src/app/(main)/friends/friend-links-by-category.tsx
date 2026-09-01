"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Globe, Folder } from "lucide-react";

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

interface FriendLinksByCategoryProps {
  links: FriendLink[];
  categories: string[];
}

// 友情链接卡片组件
function FriendLinkCard({ link }: { link: FriendLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="theme-card-hover group flex flex-col items-center p-6 text-center transition-all hover:border-amber/40 hover:shadow-amber"
    >
      {/* 头像 */}
      <div className="relative mb-4 h-16 w-16 overflow-hidden rounded-full border-2 border-[rgb(var(--border))] bg-[rgb(var(--muted))]">
        {link.avatar ? (
          <Image
            src={link.avatar}
            alt={link.name}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : link.favicon ? (
          <Image
            src={link.favicon}
            alt={link.name}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Globe className="h-8 w-8 text-[rgb(var(--muted-foreground))]" />
          </div>
        )}
      </div>

      {/* 名称 */}
      <h3 className="mb-2 font-medium transition-colors group-hover:text-amber-bright">
        {link.name}
      </h3>

      {/* 描述 */}
      {link.description && (
        <p className="mb-4 line-clamp-2 text-sm text-[rgb(var(--muted-foreground))]">
          {link.description}
        </p>
      )}

      {/* 链接图标 */}
      <ExternalLink className="h-4 w-4 text-[rgb(var(--muted-foreground))] transition-colors group-hover:text-amber-bright" />
    </a>
  );
}

// 按分类展示友链
export function FriendLinksByCategory({ links, categories }: FriendLinksByCategoryProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // 按分类分组
  const groupedLinks = links.reduce((acc, link) => {
    const category = link.category || "未分类";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(link);
    return acc;
  }, {} as Record<string, FriendLink[]>);

  // 所有分类（包括未分类）
  const allCategories = Object.keys(groupedLinks);

  // 筛选后的链接
  const filteredLinks = activeCategory
    ? groupedLinks[activeCategory] || []
    : links;

  return (
    <div>
      {/* 分类筛选 */}
      {allCategories.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-[rgb(var(--muted-foreground))]">
            分类筛选：
          </span>
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              activeCategory === null
                ? "bg-amber text-white"
                : "bg-[rgb(var(--muted))] hover:bg-amber/20"
            }`}
          >
            全部
          </button>
          {allCategories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                activeCategory === category
                  ? "bg-amber text-white"
                  : "bg-[rgb(var(--muted))] hover:bg-amber/20"
              }`}
            >
              <Folder className="mr-1 inline h-3 w-3" />
              {category}
            </button>
          ))}
        </div>
      )}

      {/* 按分类展示 */}
      {activeCategory === null ? (
        // 显示所有分类
        <div className="space-y-10">
          {allCategories.map((category) => (
            <div key={category}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Folder className="h-5 w-5 text-amber" />
                {category}
                <span className="text-sm font-normal text-[rgb(var(--muted-foreground))]">
                  ({groupedLinks[category].length})
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groupedLinks[category].map((link) => (
                  <FriendLinkCard key={link.id} link={link} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // 显示筛选后的链接
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredLinks.map((link) => (
            <FriendLinkCard key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
