import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { stat } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

// 支持的图片 MIME 类型
const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
};

/**
 * GET /uploads/:filename
 *
 * 动态提供上传文件。
 *
 * 为什么需要这个路由？
 *   Next.js 生产模式在启动时缓存 public/ 目录的文件列表。
 *   启动后新上传的文件虽然写在磁盘上，但 Next.js 不知道它们存在，
 *   直接返回 404。这个路由作为兜底，直接从文件系统读取。
 *
 *   如果文件已被 Next.js 静态文件服务识别（如启动前就存在的文件），
 *   Next.js 会优先用它，不会走进这个路由——所以不影响已有文件的性能。
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;

  // 安全检查：防止目录穿越
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", "uploads", filename);

  // 文件不存在 → 404
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const [buffer, fileStat] = await Promise.all([
      readFile(filePath),
      stat(filePath),
    ]);

    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileStat.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Last-Modified": fileStat.mtime.toUTCString(),
        "ETag": `"${fileStat.size.toString(16)}-${fileStat.mtime.getTime().toString(16)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Read error" }, { status: 500 });
  }
}
