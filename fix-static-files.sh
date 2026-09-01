#!/bin/bash
# TechBlog-Labs 静态文件修复脚本
# 使用方法：在本地执行 bash fix-static-files.sh

set -e

echo "🔧 开始修复静态文件问题..."

# ============================================================
# 1. 检查当前目录
# ============================================================
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# ============================================================
# 2. 创建临时目录
# ============================================================
echo "📁 创建临时目录..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# ============================================================
# 3. 复制缺失的文件
# ============================================================
echo "📋 复制静态文件..."

# 复制 manifest.json
if [ -f "public/manifest.json" ]; then
    cp public/manifest.json "$TEMP_DIR/"
    echo "✅ 复制 manifest.json"
else
    echo "⚠️  manifest.json 不存在，跳过"
fi

# 复制 icons 目录
if [ -d "public/icons" ]; then
    mkdir -p "$TEMP_DIR/icons"
    cp -r public/icons/* "$TEMP_DIR/icons/"
    echo "✅ 复制 icons 目录"
else
    echo "⚠️  public/icons 目录不存在，跳过"
fi

# ============================================================
# 4. 打包并上传
# ============================================================
echo "📦 打包静态文件..."
cd "$TEMP_DIR"
tar -czf static-files.tar.gz .

echo "📤 上传到服务器..."
scp static-files.tar.gz root@117.72.12.223:/root/techblog/

# ============================================================
# 5. 在服务器上解压
# ============================================================
echo "🔧 在服务器上解压..."
ssh root@117.72.12.223 "cd /root/techblog && tar -xzf static-files.tar.gz && rm static-files.tar.gz"

echo "✅ 静态文件修复完成！"
echo ""
echo "📋 修复内容："
echo "  - 上传了 manifest.json"
echo "  - 上传了 icons 目录（包含 police-icon.svg）"
echo ""
echo "🔍 验证步骤："
echo "  1. 访问 http://www.zysoo.top/manifest.json 应该返回 JSON"
echo "  2. 访问 http://www.zysoo.top/icons/police-icon.svg 应该返回 SVG"
