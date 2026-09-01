import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// 文件魔数映射（magic bytes）
const MAGIC_BYTES: { [key: string]: Buffer } = {
  "image/jpeg": Buffer.from([0xff, 0xd8, 0xff]),
  "image/png": Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  "image/gif": Buffer.from([0x47, 0x49, 0x46, 0x38]),
  "image/webp": Buffer.from([0x52, 0x49, 0x46, 0x46]), // RIFF header
};

/**
 * 验证文件真实类型（使用魔数）
 */
function verifyFileType(buffer: Buffer, declaredType: string): boolean {
  const magic = MAGIC_BYTES[declaredType];
  if (!magic) return false;

  // 检查文件头部是否匹配魔数
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) {
      return false;
    }
  }

  // WebP 需要额外检查 "WEBP" 标记
  if (declaredType === "image/webp") {
    const webpMarker = Buffer.from([0x57, 0x45, 0x42, 0x50]); // WEBP
    for (let i = 0; i < webpMarker.length; i++) {
      if (buffer[8 + i] !== webpMarker[i]) {
        return false;
      }
    }
  }

  return true;
}

/**
 * POST /api/upload — 上传图片到本地存储
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "请先登录" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "请选择图片" }, { status: 400 });
    }

    // 验证类型声明
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "仅支持 jpg、png、webp、gif 格式" },
        { status: 400 }
      );
    }

    // 验证大小
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: "图片大小不能超过 5MB" },
        { status: 400 }
      );
    }

    // 读取文件内容
    const buffer = Buffer.from(await file.arrayBuffer());

    // 验证文件真实类型（使用魔数）
    if (!verifyFileType(buffer, file.type)) {
      return NextResponse.json(
        { success: false, message: "文件类型不匹配，可能被篡改" },
        { status: 400 }
      );
    }

    // 生成文件名（纯随机，不含原始文件名，防止路径遍历攻击）
    const ext = file.type.split("/")[1] || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadDir, filename);

    // 安全检查：确保最终路径在 uploads 目录内
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
      return NextResponse.json(
        { success: false, message: "非法文件路径" },
        { status: 400 }
      );
    }

    // 确保目录存在
    await mkdir(uploadDir, { recursive: true });

    // 写入文件
    await writeFile(filePath, buffer);

    const url = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      data: { url, filename, size: file.size },
    });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json({ success: false, message: "上传失败" }, { status: 500 });
  }
}
