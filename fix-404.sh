#!/bin/bash
# 一键修复静态文件 404 问题
# 在服务器上执行：bash fix-404.sh

echo "🔧 开始修复静态文件 404 问题..."

cd /root/techblog

# ============================================================
# 1. 确保文件存在
# ============================================================
echo "📁 检查并创建文件..."

mkdir -p public/icons

# manifest.json
if [ ! -f "public/manifest.json" ]; then
    cat > public/manifest.json << 'EOF'
{
  "name": "生息日志 / VitaLog",
  "short_name": "VitaLog",
  "description": "技术博客与创意实验室",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0c0c0e",
  "theme_color": "#1a1a1f",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
EOF
    echo "✅ 创建 manifest.json"
else
    echo "✅ manifest.json 已存在"
fi

# police-icon.svg
if [ ! -f "public/icons/police-icon.svg" ]; then
    cat > public/icons/police-icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
  <rect width="16" height="16" rx="2" fill="#1890ff"/>
  <path d="M8 2L6 4H4V6L2 8L4 10V12H6L8 14L10 12H12V10L14 8L12 6V4H10L8 2Z" fill="white"/>
  <circle cx="8" cy="8" r="2" fill="#1890ff"/>
</svg>
EOF
    echo "✅ 创建 police-icon.svg"
else
    echo "✅ police-icon.svg 已存在"
fi

# 设置权限
chmod 644 public/manifest.json
chmod -R 755 public/icons

# ============================================================
# 2. 修复 nginx 配置（关键：改用 root 替代 alias）
# ============================================================
echo "📝 修复 nginx 配置..."

cat > /etc/nginx/sites-available/techblog << 'NGINX'
server {
    listen 80;
    server_name www.zysoo.top zysoo.top;

    # 静态文件由 nginx 直接提供
    location = /manifest.json {
        root /root/techblog/public;
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
    }

    location /icons/ {
        root /root/techblog/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /image/ {
        root /root/techblog/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location = /sw.js {
        root /root/techblog/public;
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
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

# 启用配置
ln -sf /etc/nginx/sites-available/techblog /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# ============================================================
# 3. 测试并重载 nginx
# ============================================================
echo "🔍 测试 nginx 配置..."
if nginx -t; then
    echo "✅ 配置测试通过，重载 nginx..."
    nginx -s reload
else
    echo "❌ 配置测试失败！"
    exit 1
fi

# ============================================================
# 4. 验证
# ============================================================
echo ""
echo "🌐 验证修复..."

echo "--- manifest.json ---"
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost/manifest.json
echo ""

echo "--- police-icon.svg ---"
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost/icons/police-icon.svg
echo ""

echo ""
echo "✅ 修复完成！"
echo "请浏览器访问："
echo "  http://www.zysoo.top/manifest.json"
echo "  http://www.zysoo.top/icons/police-icon.svg"
