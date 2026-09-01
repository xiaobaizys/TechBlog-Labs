#!/bin/bash
# TechBlog-Labs 静态文件诊断脚本
# 使用方法：在服务器上执行 bash diagnose-nginx.sh

echo "🔍 开始诊断 nginx 静态文件问题..."

# ============================================================
# 1. 检查文件是否存在
# ============================================================
echo "📁 检查文件是否存在..."

if [ -f "/root/techblog/public/manifest.json" ]; then
    echo "✅ /root/techblog/public/manifest.json 存在"
    ls -la /root/techblog/public/manifest.json
else
    echo "❌ /root/techblog/public/manifest.json 不存在"
fi

if [ -f "/root/techblog/public/icons/police-icon.svg" ]; then
    echo "✅ /root/techblog/public/icons/police-icon.svg 存在"
    ls -la /root/techblog/public/icons/police-icon.svg
else
    echo "❌ /root/techblog/public/icons/police-icon.svg 不存在"
fi

# ============================================================
# 2. 检查 nginx 配置
# ============================================================
echo ""
echo "📋 检查 nginx 配置..."

if [ -f "/etc/nginx/sites-available/techblog" ]; then
    echo "✅ nginx 配置文件存在"
    echo "配置文件内容："
    cat /etc/nginx/sites-available/techblog
else
    echo "❌ nginx 配置文件不存在"
fi

# ============================================================
# 3. 检查符号链接
# ============================================================
echo ""
echo "🔗 检查符号链接..."

if [ -L "/etc/nginx/sites-enabled/techblog" ]; then
    echo "✅ 符号链接存在"
    ls -la /etc/nginx/sites-enabled/techblog
else
    echo "❌ 符号链接不存在"
fi

# ============================================================
# 4. 检查 nginx 状态
# ============================================================
echo ""
echo "🔄 检查 nginx 状态..."

if systemctl is-active --quiet nginx; then
    echo "✅ nginx 正在运行"
else
    echo "❌ nginx 未运行"
    echo "正在启动 nginx..."
    systemctl start nginx
fi

# ============================================================
# 5. 测试 nginx 配置
# ============================================================
echo ""
echo "🔍 测试 nginx 配置..."

if nginx -t; then
    echo "✅ nginx 配置测试通过"
else
    echo "❌ nginx 配置测试失败"
    exit 1
fi

# ============================================================
# 6. 重载 nginx 配置
# ============================================================
echo ""
echo "🔄 重载 nginx 配置..."

nginx -s reload
echo "✅ nginx 配置重载完成"

# ============================================================
# 7. 测试静态文件访问
# ============================================================
echo ""
echo "🌐 测试静态文件访问..."

# 测试 manifest.json
echo "测试 manifest.json："
curl -I http://localhost/manifest.json 2>&1 | head -5

# 测试 police-icon.svg
echo "测试 police-icon.svg："
curl -I http://localhost/icons/police-icon.svg 2>&1 | head -5

# ============================================================
# 8. 检查 nginx 错误日志
# ============================================================
echo ""
echo "📋 检查 nginx 错误日志..."

if [ -f "/var/log/nginx/error.log" ]; then
    echo "最近的错误日志："
    tail -10 /var/log/nginx/error.log
else
    echo "⚠️  nginx 错误日志不存在"
fi

echo ""
echo "🔍 诊断完成！"
echo ""
echo "📋 可能的解决方案："
echo "  1. 如果文件不存在：重新上传静态文件"
echo "  2. 如果文件存在但 404：检查 nginx 配置是否正确加载"
echo "  3. 如果 nginx 配置错误：修改 nginx 配置并重载"
