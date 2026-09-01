#!/bin/bash
# 深入诊断 nginx 404
echo "=========================================="
echo "  Nginx 深入诊断"
echo "=========================================="

echo ""
echo "=== 1. Nginx 所有启用配置 ==="
ls -la /etc/nginx/sites-enabled/
echo ""
echo "=== 2. Nginx 主配置 ==="
grep -r "include" /etc/nginx/nginx.conf | grep -v "^#"

echo ""
echo "=== 3. 默认配置检查 ==="
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo "⚠️ 默认配置仍然存在！内容："
    cat /etc/nginx/sites-enabled/default
fi

if [ -f "/etc/nginx/conf.d/default.conf" ]; then
    echo "⚠️ conf.d 默认配置存在！内容："
    cat /etc/nginx/conf.d/default.conf
fi

echo ""
echo "=== 4. 测试请求路由 ==="
echo "--- curl localhost/manifest.json (Host: localhost) ---"
curl -v http://localhost/manifest.json 2>&1 | grep -E "< HTTP|Location:|^>"

echo ""
echo "--- curl with Host header ---"
curl -s -o /dev/null -w "HTTP %{http_code}" -H "Host: www.zysoo.top" http://127.0.0.1/manifest.json
echo " (Host: www.zysoo.top → manifest.json)"
curl -s -o /dev/null -w "HTTP %{http_code}" -H "Host: www.zysoo.top" http://127.0.0.1/icons/police-icon.svg
echo " (Host: www.zysoo.top → police-icon.svg)"

echo ""
echo "=== 5. Nginx 处理测试 ==="
echo "URL: /manifest.json, root: /var/www/techblog/static"
echo "期望路径: /var/www/techblog/static/manifest.json"
echo "实际存在: $(ls -la /var/www/techblog/static/manifest.json 2>/dev/null || echo '不存在')"

echo ""
echo "=== 6. 检查 /var/www 权限 ==="
ls -la /var/www/
ls -la /var/www/techblog/
ls -la /var/www/techblog/static/
