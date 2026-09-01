#!/bin/bash
# ============================================================
# TechBlog-Labs 完整修复脚本
# 在服务器上执行: bash /root/techblog/fix-all.sh
# ============================================================
set -e

echo "🔧 ========================================"
echo "   TechBlog-Labs 一键修复"
echo "   时间: $(date)"
echo "============================================"

cd /root/techblog

# ============================================================
# 1. 创建缺失的静态文件
# ============================================================
echo ""
echo "📁 [1/6] 创建静态文件..."

mkdir -p public/icons

# manifest.json
cat > public/manifest.json << 'EOF'
{
  "name": "生息日志 · VitaLog",
  "short_name": "VitaLog",
  "description": "技术博客与创意实验室 - 分享前沿技术见解，记录成长历程",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#f59e0b",
  "icons": [
    { "src": "/icons/icon-72x72.png", "sizes": "72x72", "type": "image/png" },
    { "src": "/icons/icon-96x96.png", "sizes": "96x96", "type": "image/png" },
    { "src": "/icons/icon-128x128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144x144.png", "sizes": "144x144", "type": "image/png" },
    { "src": "/icons/icon-152x152.png", "sizes": "152x152", "type": "image/png" },
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-384x384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
EOF
echo "  ✅ manifest.json"

# police-icon.svg
cat > public/icons/police-icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
  <rect width="16" height="16" rx="2" fill="#1890ff"/>
  <path d="M8 2L6 4H4V6L2 8L4 10V12H6L8 14L10 12H12V10L14 8L12 6V4H10L8 2Z" fill="white"/>
  <circle cx="8" cy="8" r="2" fill="#1890ff"/>
</svg>
EOF
echo "  ✅ police-icon.svg"

# 权限
chmod 644 public/manifest.json
chmod -R 755 public/icons
echo "  ✅ 文件权限已设置"

# ============================================================
# 2. 修复 nginx 配置（关键：用 root 替代 alias）
# ============================================================
echo ""
echo "📝 [2/6] 修复 nginx 配置..."

cat > /etc/nginx/sites-available/techblog << 'NGINX'
server {
    listen 80;
    server_name www.zysoo.top zysoo.top;

    # === 静态文件：由 nginx 直接提供 ===
    location = /manifest.json {
        root /root/techblog/public;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }

    location /icons/ {
        root /root/techblog/public;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /image/ {
        root /root/techblog/public;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location = /sw.js {
        root /root/techblog/public;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }

    # === 其他请求代理到 Next.js ===
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

ln -sf /etc/nginx/sites-available/techblog /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
echo "  ✅ nginx 配置已更新"

# ============================================================
# 3. 测试并重载 nginx
# ============================================================
echo ""
echo "🔍 [3/6] 测试 nginx 配置..."
nginx -t
echo "  ✅ 配置测试通过"

echo ""
echo "🔄 [4/6] 重载 nginx..."
nginx -s reload
echo "  ✅ nginx 已重载"

# ============================================================
# 4. 检查 Next.js 服务
# ============================================================
echo ""
echo "🔍 [5/6] 检查 Next.js 服务..."

if pm2 status 2>/dev/null | grep -q "techblog"; then
    echo "  ✅ PM2 techblog 进程存在"
    pm2 status | grep techblog
else
    echo "  ⚠️  PM2 techblog 进程不存在，正在启动..."
    pm2 start npm --name techblog -- run start -- -p 3000
    pm2 save
    echo "  ✅ PM2 已启动"
fi

# 等待服务启动
sleep 2

# 测试本地访问
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ | grep -q "200\|302\|304"; then
    echo "  ✅ Next.js 服务在端口 3000 响应正常"
else
    echo "  ⚠️  Next.js 服务响应异常，查看状态..."
    pm2 status
fi

# ============================================================
# 5. 验证修复
# ============================================================
echo ""
echo "🌐 [6/6] 验证修复..."

echo ""
echo "  --- 测试 manifest.json ---"
MANIFEST_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/manifest.json)
echo "  HTTP 状态码: $MANIFEST_CODE"
if [ "$MANIFEST_CODE" = "200" ]; then
    echo "  ✅ manifest.json 修复成功！"
else
    echo "  ❌ manifest.json 仍然 $MANIFEST_CODE"
fi

echo ""
echo "  --- 测试 police-icon.svg ---"
POLICE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/icons/police-icon.svg)
echo "  HTTP 状态码: $POLICE_CODE"
if [ "$POLICE_CODE" = "200" ]; then
    echo "  ✅ police-icon.svg 修复成功！"
else
    echo "  ❌ police-icon.svg 仍然 $POLICE_CODE"
fi

# ============================================================
# 完成
# ============================================================
echo ""
echo "============================================"
echo "✅ 修复完成！"
echo ""
echo "📋 验证链接："
echo "  http://www.zysoo.top/manifest.json"
echo "  http://www.zysoo.top/icons/police-icon.svg"
echo "============================================"
