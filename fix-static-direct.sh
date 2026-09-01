#!/bin/bash
# TechBlog-Labs 静态文件直接修复脚本
# 使用方法：在本地执行 bash fix-static-direct.sh

set -e

echo "🔧 开始直接修复静态文件问题..."

# ============================================================
# 1. 检查当前目录
# ============================================================
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# ============================================================
# 2. 检查文件是否存在
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
# 3. 上传文件到服务器
# ============================================================
echo "📤 上传文件到服务器..."

# 上传 manifest.json
scp public/manifest.json root@117.72.12.223:/root/techblog/
echo "✅ 上传 manifest.json"

# 上传 icons 目录
scp -r public/icons root@117.72.12.223:/root/techblog/
echo "✅ 上传 icons 目录"

# ============================================================
# 4. 在服务器上执行修复
# ============================================================
echo "🔧 在服务器上执行修复..."

ssh root@117.72.12.223 << 'EOF'
cd /root/techblog

# 检查文件是否存在
echo "📁 检查服务器文件..."
ls -la manifest.json
ls -la icons/

# 重启 PM2
echo "🔄 重启 PM2..."
pm2 restart techblog

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 3

# 测试本地访问
echo "🌐 测试本地访问..."
curl -I http://localhost:3000/manifest.json 2>&1 | head -3
curl -I http://localhost:3000/icons/police-icon.svg 2>&1 | head -3

echo "✅ 服务器修复完成"
EOF

echo "✅ 静态文件修复完成！"
echo ""
echo "📋 修复内容："
echo "  - 上传了 manifest.json"
echo "  - 上传了 icons 目录"
echo "  - 重启了 PM2 进程"
echo ""
echo "🔍 验证步骤："
echo "  1. 访问 http://www.zysoo.top/manifest.json"
echo "  2. 访问 http://www.zysoo.top/icons/police-icon.svg"
