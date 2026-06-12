import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-tar",
  "application/gzip",
  "application/x-gzip",
  "application/x-bzip2",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * POST /api/upload-source — 上传项目源代码压缩包
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "无权限" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "请选择文件" }, { status: 400 });
    }

    // 验证类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "仅支持 zip、tar.gz、7z、rar 等压缩包格式" },
        { status: 400 }
      );
    }

    // 验证大小
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: "文件大小不能超过 50MB" },
        { status: 400 }
      );
    }

    // 保留原始文件名，加时间戳防重名
    const ext = path.extname(file.name) || ".zip";
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "");
    const filename = `${baseName}-${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "source");
    const filePath = path.join(uploadDir, filename);

    // 确保目录存在
    await mkdir(uploadDir, { recursive: true });

    // 写入文件
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const url = `/uploads/source/${filename}`;

    return NextResponse.json({
      success: true,
      data: { url, filename, size: file.size },
    });
  } catch (error) {
    console.error("[POST /api/upload-source]", error);
    return NextResponse.json({ success: false, message: "上传失败" }, { status: 500 });
  }
}