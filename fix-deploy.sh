#!/bin/bash
# TechBlog-Labs 部署修复脚本
# 使用方法：在服务器上执行 bash fix-deploy.sh

set -e

echo "🔧 开始修复 TechBlog-Labs 部署问题..."

# ============================================================
# 1. 检查当前目录
# ============================================================
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# ============================================================
# 2. 修复 manifest.json 和 icons 问题
# ============================================================
echo "📁 检查 public 目录..."

# 确保 public/icons 目录存在
mkdir -p public/icons

# 检查 manifest.json 是否存在
if [ ! -f "public/manifest.json" ]; then
    echo "⚠️  manifest.json 不存在，跳过"
else
    echo "✅ manifest.json 存在"
fi

# 检查 police-icon.svg 是否存在
if [ ! -f "public/icons/police-icon.svg" ]; then
    echo "⚠️  police-icon.svg 不存在，跳过"
else
    echo "✅ police-icon.svg 存在"
fi

# ============================================================
# 3. 修复 Prisma Client
# ============================================================
echo "🔄 重新生成 Prisma Client..."
npx prisma generate

# ============================================================
# 4. 检查数据库表
# ============================================================
echo "🔍 检查数据库表..."

# 检查 Visit 表是否存在
if npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Visit');" 2>/dev/null | grep -q "true"; then
    echo "✅ Visit 表存在"
else
    echo "⚠️  Visit 表不存在，正在创建..."
    npx prisma db push
fi

# 检查 DailyStats 表是否存在
if npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'DailyStats');" 2>/dev/null | grep -q "true"; then
    echo "✅ DailyStats 表存在"
else
    echo "⚠️  DailyStats 表不存在，正在创建..."
    npx prisma db push
fi

# ============================================================
# 5. 重新构建
# ============================================================
echo "🔨 重新构建项目..."
npx next build

# ============================================================
# 6. 重启 PM2
# ============================================================
echo "🔄 重启 PM2 进程..."
pm2 restart techblog

echo "✅ 修复完成！"
echo ""
echo "📋 修复内容："
echo "  - 检查了 public/manifest.json 和 public/icons/police-icon.svg"
echo "  - 重新生成了 Prisma Client"
echo "  - 检查并创建了数据库表（Visit, DailyStats）"
echo "  - 重新构建了项目"
echo "  - 重启了 PM2 进程"
echo ""
echo "🔍 验证步骤："
echo "  1. 访问 http://www.zysoo.top/manifest.json 应该返回 JSON"
echo "  2. 访问 http://www.zysoo.top/icons/police-icon.svg 应该返回 SVG"
echo "  3. 访问 http://www.zysoo.top/api/admin/stats/dimensions?days=7 应该返回数据"
