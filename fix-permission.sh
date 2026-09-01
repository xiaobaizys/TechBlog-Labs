#!/bin/bash
# 修复 nginx 权限问题 - 关键：nginx 无法读取 /root 目录
set -e

echo "🔧 修复 nginx 权限问题..."

# 1. 检查 nginx 用户
NGINX_USER=$(ps aux | grep nginx | grep -v grep | head -1 | awk '{print $1}' | head -1)
echo "Nginx 运行用户: $NGINX_USER"

# 2. 检查当前 /root 权限
echo ""
echo "当前 /root 权限:"
ls -la /root | head -1

# 3. 方案：将静态文件移到 nginx 可访问的位置
echo ""
echo "📁 将静态文件移到 /var/www/techblog/static..."
mkdir -p /var/www/techblog/static/icons
cp /root/techblog/public/manifest.json /var/www/techblog/static/
cp -r /root/techblog/public/icons/* /var/www/techblog/static/icons/
chmod -R 755 /var/www/techblog

echo "✅ 静态文件已复制到 /var/www/techblog/static"

# 4. 更新 nginx 配置
echo ""
echo "📝 更新 nginx 配置..."

cat > /etc/nginx/sites-available/techblog << 'NGINX'
server {
    listen 80;
    server_name www.zysoo.top zysoo.top;

    # 静态文件（放在 nginx 可访问的位置）
    location = /manifest.json {
        root /var/www/techblog/static;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }
    location /icons/ {
        root /var/www/techblog/static;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location /image/ {
        root /var/www/techblog/static;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location = /sw.js {
        root /var/www/techblog/static;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }

    # 其他请求代理到 Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    client_max_body_size 200m;
}
NGINX

# 5. 重载 nginx
echo ""
echo "🔄 重载 nginx..."
nginx -t && nginx -s reload

# 6. 验证
echo ""
echo "🌐 验证..."
MANIFEST_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/manifest.json)
POLICE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/icons/police-icon.svg)
echo "  manifest.json: HTTP $MANIFEST_CODE"
echo "  police-icon.svg: HTTP $POLICE_CODE"

if [ "$MANIFEST_CODE" = "200" ]; then
    echo "  ✅ manifest.json 修复成功！"
else
    echo "  ❌ manifest.json 仍返回 $MANIFEST_CODE"
fi

if [ "$POLICE_CODE" = "200" ]; then
    echo "  ✅ police-icon.svg 修复成功！"
else
    echo "  ❌ police-icon.svg 仍返回 $POLICE_CODE"
fi

echo ""
echo "✅ 修复完成！"
