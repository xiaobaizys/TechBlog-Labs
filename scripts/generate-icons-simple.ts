/**
 * PWA 图标简化生成脚本
 *
 * 使用方法:
 * 1. 确保 public/image/logo.png 存在 (建议 512x512 或更大)
 * 2. 运行: npx tsx scripts/generate-icons-simple.ts
 *
 * 此脚本会复制 logo.png 到各尺寸图标位置
 * 如需生成精确尺寸，请使用在线工具: https://favicon.io/favicon-generator/
 */

import fs from "fs";
import path from "path";

const SOURCE_ICON = path.join(__dirname, "../public/image/logo.png");
const OUTPUT_DIR = path.join(__dirname, "../public/icons");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

function generateIcons() {
  // 检查源文件是否存在
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error("❌ 源图标不存在:", SOURCE_ICON);
    console.log("\n请准备一个至少 512x512 的 PNG 图标，保存为 public/image/logo.png");
    process.exit(1);
  }

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("🎨 开始复制 PWA 图标...\n");
  console.log("⚠️  注意: 当前使用简化方案，所有图标使用原始文件");
  console.log("   如需精确尺寸，请使用 https://favicon.io 生成\n");

  // 复制到各尺寸
  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    fs.copyFileSync(SOURCE_ICON, outputPath);
    console.log(`  ✓ 生成 icon-${size}x${size}.png`);
  }

  // 同时复制一份作为 apple-touch-icon
  const appleIconPath = path.join(OUTPUT_DIR, "apple-touch-icon.png");
  fs.copyFileSync(SOURCE_ICON, appleIconPath);
  console.log("  ✓ 生成 apple-touch-icon.png");

  console.log("\n✅ PWA 图标生成完成！");
  console.log(`📁 图标位置: ${OUTPUT_DIR}`);
  console.log("\n💡 提示: 当前图标可能不是精确尺寸，建议:");
  console.log("   1. 使用 https://favicon.io 生成精确尺寸图标");
  console.log("   2. 或安装 sharp: npm install sharp@0.32.6 --save-dev");
  console.log("      然后运行: npx tsx scripts/generate-icons.ts");
}

generateIcons();
