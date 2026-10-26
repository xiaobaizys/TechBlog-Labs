/**
 * PWA 图标生成脚本
 *
 * 使用方法：
 * 1. 安装 sharp: npm install sharp --save-dev
 * 2. 准备源图标: public/image/logo.png (建议 512x512 或更大)
 * 3. 运行: npx tsx scripts/generate-icons.ts
 *
 * 或者使用 favicon.io 在线生成：
 * - 访问 https://favicon.io/favicon-generator/
 * - 文字: TB
 * - 背景: 圆形
 * - 背景色: #0a0a0a
 * - 文字色: #f59e0b
 */

import sharp from "sharp";
import path from "path";
import fs from "fs";

const SOURCE_ICON = path.join(__dirname, "../public/image/logo.png");
const OUTPUT_DIR = path.join(__dirname, "../public/icons");

// 需要生成的图标尺寸
const ICON_SIZES = [
  { size: 72, name: "icon-72x72.png" },
  { size: 96, name: "icon-96x96.png" },
  { size: 128, name: "icon-128x128.png" },
  { size: 144, name: "icon-144x144.png" },
  { size: 152, name: "icon-152x152.png" },
  { size: 192, name: "icon-192x192.png" },
  { size: 384, name: "icon-384x384.png" },
  { size: 512, name: "icon-512x512.png" },
];

// Apple Touch Icon
const APPLE_ICON = { size: 180, name: "apple-touch-icon.png" };

// Favicon
const FAVICON = { size: 32, name: "favicon-32x32.png" };
const FAVICON_SMALL = { size: 16, name: "favicon-16x16.png" };

async function generateIcons() {
  console.log("🎨 开始生成 PWA 图标...\n");

  // 检查源文件
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error("❌ 源图标不存在:", SOURCE_ICON);
    console.log("\n请准备一个至少 512x512 的 PNG 图标，保存为 public/image/logo.png");
    process.exit(1);
  }

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 获取源图标信息
  const metadata = await sharp(SOURCE_ICON).metadata();
  console.log(`📷 源图标: ${metadata.width}x${metadata.height} ${metadata.format}\n`);

  // 生成各尺寸图标
  console.log("📱 生成 PWA 图标:");
  for (const { size, name } of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, name);
    await sharp(SOURCE_ICON)
      .resize(size, size, {
        fit: "contain",
        background: { r: 10, g: 10, b: 10, alpha: 1 }, // #0a0a0a
      })
      .png()
      .toFile(outputPath);
    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  // 生成 Apple Touch Icon
  const applePath = path.join(OUTPUT_DIR, APPLE_ICON.name);
  await sharp(SOURCE_ICON)
    .resize(APPLE_ICON.size, APPLE_ICON.size, {
      fit: "contain",
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    })
    .png()
    .toFile(applePath);
  console.log(`  ✓ ${APPLE_ICON.name} (${APPLE_ICON.size}x${APPLE_ICON.size})`);

  // 生成 Favicon
  const faviconPath = path.join(OUTPUT_DIR, FAVICON.name);
  await sharp(SOURCE_ICON)
    .resize(FAVICON.size, FAVICON.size, {
      fit: "contain",
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    })
    .png()
    .toFile(faviconPath);
  console.log(`  ✓ ${FAVICON.name} (${FAVICON.size}x${FAVICON.size})`);

  const faviconSmallPath = path.join(OUTPUT_DIR, FAVICON_SMALL.name);
  await sharp(SOURCE_ICON)
    .resize(FAVICON_SMALL.size, FAVICON_SMALL.size, {
      fit: "contain",
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    })
    .png()
    .toFile(faviconSmallPath);
  console.log(`  ✓ ${FAVICON_SMALL.name} (${FAVICON_SMALL.size}x${FAVICON_SMALL.size})`);

  // 复制 favicon 到 public 根目录
  const publicFavicon = path.join(__dirname, "../public/favicon.ico");
  fs.copyFileSync(faviconPath, publicFavicon);
  console.log(`  ✓ favicon.ico (复制到 public/)`);

  console.log("\n✅ 图标生成完成！");
  console.log(`📁 输出目录: ${OUTPUT_DIR}`);
}

generateIcons().catch((error) => {
  console.error("❌ 生成失败:", error);
  process.exit(1);
});
