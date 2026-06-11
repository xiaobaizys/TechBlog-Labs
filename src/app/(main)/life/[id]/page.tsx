import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LifeDetailClient } from "./life-detail-client";

type LifePostData = {
  id: string; content: string; images: string[];
  likeCount: number; isPublic: boolean; isLiked: boolean;
  createdAt: string; updatedAt: string;
  author: { id: string; name: string | null; image: string | null };
};

async function getLifePost(id: string): Promise<LifePostData | null> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/life-posts/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

/**
 * 生活详情 SEO：私密内容不索引；公开内容给社交分享卡片用
 *  - 直接走 prisma 拿 isPublic + content（不重复 +1 view 的 API）
 *  - 公开则 description = content 前 160 字
 */
export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    const post = await prisma.lifePost.findUnique({
      where: { id: params.id },
      select: { isPublic: true, content: true, images: true },
    });
    if (!post || !post.isPublic) {
      return { title: "生息", robots: { index: false, follow: true } };
    }
    const desc = post.content.replace(/\s+/g, " ").trim().slice(0, 160);
    return {
      title: "生息",
      description: desc,
      openGraph: {
        title: "生息",
        description: desc,
        images: post.images?.[0] ? [post.images[0]] : [],
        type: "article",
      },
      robots: { index: false, follow: true }, // 整体生活流不索引
    };
  } catch {
    return { title: "生息" };
  }
}

export default async function LifeDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const post = await getLifePost(params.id);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <LifeDetailClient post={post} currentUserId={session?.user?.id} isAdmin={session?.user?.role === "ADMIN"} />
    </div>
  );
}
