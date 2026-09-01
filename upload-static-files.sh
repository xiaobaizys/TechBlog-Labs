#!/bin/bash
# TechBlog-Labs 静态文件上传修复脚本
# 使用方法：在本地执行 bash upload-static-files.sh

set -e

echo "🔧 开始上传静态文件到服务器..."

# ============================================================
# 1. 检查当前目录
# ============================================================
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# ============================================================
# 2. 检查本地文件是否存在
# ============================================================
echo "📁 检查本地文件..."

if [ ! -f "public/manifest.json" ]; then
    echo "❌ 错误：public/manifest.json 不存在"
    exit 1
fi

if [ ! -f "public/icons/police-icon.svg" ]; then
    echo "❌ 错误：public/icons/police-icon.svg 不存在"
    exit 1
fi

echo "✅ 本地文件检查通过"

# ============================================================
# 3. 创建服务器目录
# ============================================================
echo "📁 创建服务器目录..."

ssh root@117.72.12.223 << 'EOF'
mkdir -p /root/techblog/public
mkdir -p /root/techblog/public/icons
EOF

echo "✅ 服务器目录创建完成"

# ============================================================
# 4. 上传文件
# ============================================================
echo "📤 上传文件..."

# 上传 manifest.json
scp public/manifest.json root@117.72.12.223:/root/techblog/public/
echo "✅ 上传 manifest.json"

# 上传 icons 目录
scp -r public/icons/* root@117.72.12.223:/root/techblog/public/icons/
echo "✅ 上传 icons 目录"

# 上传其他必要文件
if [ -f "public/image/logo.png" ]; then
    scp public/image/logo.png root@117.72.12.223:/root/techblog/public/image/
    echo "✅ 上传 logo.png"
fi

if [ -f "public/sw.js" ]; then
    scp public/sw.js root@117.72.12.223:/root/techblog/public/
    echo "✅ 上传 sw.js"
fi

# ============================================================
# 5. 验证上传
# ============================================================
echo ""
echo "🔍 验证上传..."

ssh root@117.72.12.223 << 'EOF'
echo "检查文件是否存在："
ls -la /root/techblog/public/manifest.json
ls -la /root/techblog/public/icons/
EOF

# ============================================================
# 6. 重载 nginx
# ============================================================
echo ""
echo "🔄 重载 nginx 配置..."

ssh root@117.72.12.223 << 'EOF'
nginx -s reload
echo "✅ nginx 配置重载完成"
EOF

echo ""
echo "✅ 静态文件上传完成！"
echo ""
echo "📋 上传内容："
echo "  - manifest.json"
echo "  - icons 目录（包含 police-icon.svg）"
echo "  - logo.png（如果存在）"
echo "  - sw.js（如果存在）"
echo ""
echo "🔍 验证步骤："
echo "  1. 访问 http://www.zysoo.top/manifest.json"
echo "  2. 访问 http://www.zysoo.top/icons/police-icon.svg"
