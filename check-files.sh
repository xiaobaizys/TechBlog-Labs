#!/bin/bash
# TechBlog-Labs 文件结构检查脚本
# 使用方法：在服务器上执行 bash check-files.sh

echo "🔍 检查服务器文件结构..."

# ============================================================
# 1. 检查项目根目录
# ============================================================
echo "📁 检查项目根目录..."

if [ -d "/root/techblog" ]; then
    echo "✅ /root/techblog 目录存在"
    ls -la /root/techblog/
else
    echo "❌ /root/techblog 目录不存在"
    exit 1
fi

# ============================================================
# 2. 检查 public 目录
# ============================================================
echo ""
echo "📁 检查 public 目录..."

if [ -d "/root/techblog/public" ]; then
    echo "✅ public 目录存在"
    ls -la /root/techblog/public/
else
    echo "❌ public 目录不存在"
    echo "正在创建 public 目录..."
    mkdir -p /root/techblog/public
fi

# ============================================================
# 3. 检查 icons 目录
# ============================================================
echo ""
echo "📁 检查 icons 目录..."

if [ -d "/root/techblog/public/icons" ]; then
    echo "✅ icons 目录存在"
    ls -la /root/techblog/public/icons/
else
    echo "❌ icons 目录不存在"
    echo "正在创建 icons 目录..."
    mkdir -p /root/techblog/public/icons
fi

# ============================================================
# 4. 检查 manifest.json
# ============================================================
echo ""
echo "📄 检查 manifest.json..."

if [ -f "/root/techblog/public/manifest.json" ]; then
    echo "✅ manifest.json 存在"
    ls -la /root/techblog/public/manifest.json
    echo "文件内容前 5 行："
    head -5 /root/techblog/public/manifest.json
else
    echo "❌ manifest.json 不存在"
fi

# ============================================================
# 5. 检查 police-icon.svg
# ============================================================
echo ""
echo "🎨 检查 police-icon.svg..."

if [ -f "/root/techblog/public/icons/police-icon.svg" ]; then
    echo "✅ police-icon.svg 存在"
    ls -la /root/techblog/public/icons/police-icon.svg
else
    echo "❌ police-icon.svg 不存在"
fi

# ============================================================
# 6. 检查其他必要文件
# ============================================================
echo ""
echo "📋 检查其他必要文件..."

# 检查 logo.png
if [ -f "/root/techblog/public/image/logo.png" ]; then
    echo "✅ logo.png 存在"
else
    echo "❌ logo.png 不存在"
fi

# 检查 sw.js
if [ -f "/root/techblog/public/sw.js" ]; then
    echo "✅ sw.js 存在"
else
    echo "❌ sw.js 不存在"
fi

# ============================================================
# 7. 检查 .next 目录
# ============================================================
echo ""
echo "📂 检查 .next 目录..."

if [ -d "/root/techblog/.next" ]; then
    echo "✅ .next 目录存在"
    ls -la /root/techblog/.next/ | head -10
else
    echo "❌ .next 目录不存在"
fi

echo ""
echo "🔍 文件结构检查完成！"
echo ""
echo "📋 可能的解决方案："
echo "  1. 如果文件不存在：需要重新上传静态文件"
echo "  2. 如果目录不存在：需要创建目录并上传文件"
echo "  3. 如果文件在错误位置：需要移动文件到正确位置"
