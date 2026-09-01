import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveAiProvider } from "@/lib/ai/provider";

/**
 * 生成文章摘要
 * POST /api/posts/[slug]/summary
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // 查找文章
    const post = await prisma.post.findUnique({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        title: true,
        content: true,
        summary: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "文章不存在" },
        { status: 404 }
      );
    }

    // 如果已有摘要，直接返回
    if (post.summary) {
      return NextResponse.json({ summary: post.summary });
    }

    // 获取 AI 提供商配置
    const provider = await getActiveAiProvider();
    if (!provider) {
      return NextResponse.json(
        { error: "AI 服务未配置" },
        { status: 503 }
      );
    }

    // 限制内容长度，避免 token 过多
    const content = post.content.slice(0, 4000);

    // 调用 DeepSeek API 生成摘要
    const response = await fetch(`${provider.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model || "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "你是一个专业的文章摘要生成器。请为以下文章生成一个简洁的摘要，字数控制在100-150字之间。摘要应该：1. 准确概括文章核心内容 2. 使用简洁明了的语言 3. 适合在文章列表中展示 4. 不要使用 markdown 格式",
          },
          {
            role: "user",
            content: `文章标题：${post.title}\n\n文章内容：${content}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      return NextResponse.json(
        { error: "生成摘要失败，请稍后重试" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      return NextResponse.json(
        { error: "生成摘要失败" },
        { status: 500 }
      );
    }

    // 保存摘要到数据库
    await prisma.post.update({
      where: { id: post.id },
      data: { summary },
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Generate summary error:", error);
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}
