import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/projects/tech-stacks — 获取所有技术栈及使用次数
 */
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      where: { isPublic: true },
      select: { techStack: true },
    });

    const countMap = new Map<string, number>();
    for (const p of projects) {
      for (const tech of p.techStack) {
        countMap.set(tech, (countMap.get(tech) || 0) + 1);
      }
    }

    const stacks = Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ success: true, data: stacks });
  } catch (error) {
    console.error("[GET /api/projects/tech-stacks]", error);
    return NextResponse.json({ success: false, message: "获取失败" }, { status: 500 });
  }
}
