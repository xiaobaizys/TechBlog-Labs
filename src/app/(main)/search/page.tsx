import { Suspense } from "react";
import { SearchBox } from "@/components/search/SearchBox";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchResultsSkeleton } from "@/components/search/SearchResultsSkeleton";

/**
 * /search 搜索页
 *
 *  布局：
 *   - 顶部：搜索框
 *   - 主体：搜索结果
 *   - 无 query：结果区域为空态（SearchResults 内部处理）
 */

export const metadata = {
  title: "搜索",
  description: "搜索文章标题、内容、标签",
};

interface SearchPageProps {
  searchParams: {
    q?: string;
    page?: string;
  };
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const query = (searchParams.q ?? "").trim();
  const page = parseInt(searchParams.page ?? "1", 10);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      {/* 页面标题 */}
      <header className="mb-8">
        <h1 className="mb-2 font-serif text-3xl font-semibold tracking-tight">
          搜索
        </h1>
        <p className="text-[rgb(var(--muted-foreground))]">
          搜索文章标题、内容、标签
        </p>
      </header>

      {/* 搜索框 */}
      <div className="mb-8">
        <SearchBox
          placeholder="输入关键词搜索..."
          className="max-w-2xl"
        />
      </div>

      {/* 搜索结果 */}
      <Suspense fallback={<SearchResultsSkeleton />}>
        <SearchResults query={query} page={page} />
      </Suspense>
    </div>
  );
}
