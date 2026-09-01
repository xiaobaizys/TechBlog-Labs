#!/bin/bash
# TechBlog-Labs 静态文件诊断脚本
# 使用方法：在服务器上执行 bash diagnose-static.sh

echo "🔍 开始诊断静态文件问题..."

# ============================================================
# 1. 检查文件是否存在
# ============================================================
echo "📁 检查文件是否存在..."

if [ -f "manifest.json" ]; then
    echo "✅ manifest.json 存在"
    ls -la manifest.json
else
    echo "❌ manifest.json 不存在"
fi

if [ -f "icons/police-icon.svg" ]; then
    echo "✅ icons/police-icon.svg 存在"
    ls -la icons/police-icon.svg
else
    echo "❌ icons/police-icon.svg 不存在"
fi

# ============================================================
# 2. 检查文件内容
# ============================================================
echo ""
echo "📋 检查文件内容..."

if [ -f "manifest.json" ]; then
    echo "manifest.json 内容："
    head -5 manifest.json
    echo "..."
fi

if [ -f "icons/police-icon.svg" ]; then
    echo "icons/police-icon.svg 内容："
    head -5 icons/police-icon.svg
    echo "..."
fi

# ============================================================
# 3. 检查 Next.js 配置
# ============================================================
echo ""
echo "⚙️  检查 Next.js 配置..."

if [ -f "next.config.mjs" ]; then
    echo "next.config.mjs 内容："
    cat next.config.mjs
else
    echo "❌ next.config.mjs 不存在"
fi

# ============================================================
# 4. 检查 PM2 状态
# ============================================================
echo ""
echo "🔄 检查 PM2 状态..."

pm2 status

# ============================================================
# 5. 测试本地访问
# ============================================================
echo ""
echo "🌐 测试本地访问..."

# 测试 manifest.json
echo "测试 manifest.json："
curl -I http://localhost:3000/manifest.json 2>&1 | head -3

# 测试 police-icon.svg
echo "测试 police-icon.svg："
curl -I http://localhost:3000/icons/police-icon.svg 2>&1 | head -3

# ============================================================
# 6. 检查 nginx 配置
# ============================================================
echo ""
echo "🔧 检查 nginx 配置..."

if [ -f "/etc/nginx/sites-available/techblog" ]; then
    echo "nginx 配置文件存在："
    cat /etc/nginx/sites-available/techblog
else
    echo "⚠️  nginx 配置文件不存在"
fi

# ============================================================
# 7. 检查 .next 目录
# ============================================================
echo ""
echo "📂 检查 .next 目录..."

if [ -d ".next" ]; then
    echo ".next 目录存在"
    ls -la .next/ | head -10
else
    echo "❌ .next 目录不存在"
fi

# ============================================================
# 8. 检查 public 目录
# ============================================================
echo ""
echo "📁 检查 public 目录..."

if [ -d "public" ]; then
    echo "public 目录存在"
    ls -la public/
else
    echo "❌ public 目录不存在"
fi

echo ""
echo "🔍 诊断完成！"
echo ""
echo "📋 可能的解决方案："
echo "  1. 如果文件不存在：重新上传静态文件"
echo "  2. 如果文件存在但 404：重启 PM2 或检查 nginx 配置"
echo "  3. 如果 nginx 配置错误：修改 nginx 配置并重载"
