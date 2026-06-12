import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile, stat } from "fs/promises";
import path from "path";

/**
 * GET /api/projects/[id]/download — 下载项目源代码
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: { id: true, title: true, sourceFilePath: true },
    });

    if (!project) {
      return NextResponse.json({ success: false, message: "项目不存在" }, { status: 404 });
    }

    if (!project.sourceFilePath) {
      return NextResponse.json({ success: false, message: "该项目暂无源代码可下载" }, { status: 404 });
    }

    // 解析文件的绝对路径
    const filePath = path.join(process.cwd(), "public", project.sourceFilePath);

    // 检查文件是否存在
    try {
      await stat(filePath);
    } catch {
      return NextResponse.json({ success: false, message: "源代码文件已被移除" }, { status: 404 });
    }

    const buffer = await readFile(filePath);
    const filename = path.basename(project.sourceFilePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[GET /api/projects/:id/download]", error);
    return NextResponse.json({ success: false, message: "下载失败" }, { status: 500 });
  }
}