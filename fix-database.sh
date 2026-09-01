#!/bin/bash
# TechBlog-Labs 数据库表修复脚本
# 使用方法：在服务器上执行 bash fix-database.sh

set -e

echo "🔧 开始修复数据库表..."

# ============================================================
# 1. 检查当前目录
# ============================================================
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

# ============================================================
# 2. 检查 Prisma Client 是否生成
# ============================================================
echo "🔄 检查 Prisma Client..."
if [ ! -d "node_modules/@prisma/client" ]; then
    echo "⚠️  Prisma Client 未安装，正在安装..."
    npm install
fi

# 重新生成 Prisma Client
echo "🔄 重新生成 Prisma Client..."
npx prisma generate

# ============================================================
# 3. 检查数据库连接
# ============================================================
echo "🔍 检查数据库连接..."
if ! npx prisma db execute --stdin <<< "SELECT 1;" 2>/dev/null; then
    echo "❌ 数据库连接失败，请检查 .env.production 中的 DATABASE_URL"
    exit 1
fi
echo "✅ 数据库连接正常"

# ============================================================
# 4. 检查并创建表
# ============================================================
echo "📋 检查数据库表..."

# 检查 Visit 表
echo "🔍 检查 Visit 表..."
if npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Visit');" 2>/dev/null | grep -q "true"; then
    echo "✅ Visit 表存在"
else
    echo "⚠️  Visit 表不存在，正在创建..."
    # 直接执行 SQL 创建 Visit 表
    npx prisma db execute --stdin << 'EOF'
CREATE TABLE IF NOT EXISTS "Visit" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT,
    "page" TEXT NOT NULL,
    "referer" TEXT,
    "userAgent" TEXT,
    "ip" VARCHAR(45),
    "country" VARCHAR(50),
    "province" VARCHAR(50),
    "city" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Visit_visitorId_idx" ON "Visit"("visitorId");
CREATE INDEX IF NOT EXISTS "Visit_createdAt_idx" ON "Visit"("createdAt");
CREATE INDEX IF NOT EXISTS "Visit_page_idx" ON "Visit"("page");
CREATE INDEX IF NOT EXISTS "Visit_visitorId_createdAt_idx" ON "Visit"("visitorId", "createdAt");
CREATE INDEX IF NOT EXISTS "Visit_province_idx" ON "Visit"("province");
CREATE INDEX IF NOT EXISTS "Visit_userAgent_createdAt_idx" ON "Visit"("userAgent", "createdAt");
CREATE INDEX IF NOT EXISTS "Visit_province_city_idx" ON "Visit"("province", "city");
CREATE INDEX IF NOT EXISTS "Visit_referer_idx" ON "Visit"("referer");
CREATE INDEX IF NOT EXISTS "Visit_city_idx" ON "Visit"("city");
EOF
    echo "✅ Visit 表创建完成"
fi

# 检查 DailyStats 表
echo "🔍 检查 DailyStats 表..."
if npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'DailyStats');" 2>/dev/null | grep -q "true"; then
    echo "✅ DailyStats 表存在"
else
    echo "⚠️  DailyStats 表不存在，正在创建..."
    npx prisma db execute --stdin << 'EOF'
CREATE TABLE IF NOT EXISTS "DailyStats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyStats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyStats_date_key" ON "DailyStats"("date");
CREATE INDEX IF NOT EXISTS "DailyStats_date_idx" ON "DailyStats"("date");
EOF
    echo "✅ DailyStats 表创建完成"
fi

# ============================================================
# 5. 验证表创建
# ============================================================
echo "🔍 验证表创建..."

# 再次检查 Visit 表
if npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Visit');" 2>/dev/null | grep -q "true"; then
    echo "✅ Visit 表验证成功"
else
    echo "❌ Visit 表创建失败，请手动执行 SQL"
    exit 1
fi

# 再次检查 DailyStats 表
if npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'DailyStats');" 2>/dev/null | grep -q "true"; then
    echo "✅ DailyStats 表验证成功"
else
    echo "❌ DailyStats 表创建失败，请手动执行 SQL"
    exit 1
fi

# ============================================================
# 6. 重启 PM2
# ============================================================
echo "🔄 重启 PM2 进程..."
pm2 restart techblog

echo "✅ 数据库表修复完成！"
echo ""
echo "📋 修复内容："
echo "  - 检查并创建了 Visit 表（如果不存在）"
echo "  - 检查并创建了 DailyStats 表（如果不存在）"
echo "  - 重新生成了 Prisma Client"
echo "  - 重启了 PM2 进程"
echo ""
echo "🔍 验证步骤："
echo "  1. 访问 http://www.zysoo.top/api/admin/stats/dimensions?days=7 应该返回数据"
echo "  2. 查看 PM2 日志：pm2 logs techblog --err --lines 20"
