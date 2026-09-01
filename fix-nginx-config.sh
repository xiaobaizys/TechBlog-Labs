#!/bin/bash
# TechBlog-Labs nginx 配置检查和修复脚本
# 使用方法：在服务器上执行 bash fix-nginx-config.sh

set -e

echo "🔧 开始检查和修复 nginx 配置..."

# ============================================================
# 1. 检查 nginx 配置文件
# ============================================================
echo "📋 检查 nginx 配置文件..."

if [ ! -f "/etc/nginx/sites-available/techblog" ]; then
    echo "❌ nginx 配置文件不存在"
    echo "正在创建配置文件..."
    cat > /etc/nginx/sites-available/techblog << 'EOF'
server {
    listen 80;
    server_name www.zysoo.top zysoo.top;

    # 静态文件直接由 nginx 服务
    location /manifest.json {
        alias /root/techblog/public/manifest.json;
        default_type application/json;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }

    location /icons/ {
        alias /root/techblog/public/icons/;
        default_type image/svg+xml;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /image/ {
        alias /root/techblog/public/image/;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /sw.js {
        alias /root/techblog/public/sw.js;
        default_type application/javascript;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }

    # 其他请求代理到 Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 文件上传大小限制
    client_max_body_size 200m;
}
EOF
    echo "✅ nginx 配置文件创建完成"
else
    echo "✅ nginx 配置文件已存在"
fi

# ============================================================
# 2. 检查符号链接
# ============================================================
echo ""
echo "🔗 检查符号链接..."

if [ ! -L "/etc/nginx/sites-enabled/techblog" ]; then
    echo "⚠️  符号链接不存在，正在创建..."
    ln -sf /etc/nginx/sites-available/techblog /etc/nginx/sites-enabled/
    echo "✅ 符号链接创建完成"
else
    echo "✅ 符号链接已存在"
fi

# ============================================================
# 3. 检查文件权限
# ============================================================
echo ""
echo "🔐 检查文件权限..."

# 检查 manifest.json 权限
if [ -f "/root/techblog/public/manifest.json" ]; then
    chmod 644 /root/techblog/public/manifest.json
    echo "✅ manifest.json 权限已设置为 644"
fi

# 检查 icons 目录权限
if [ -d "/root/techblog/public/icons" ]; then
    chmod -R 755 /root/techblog/public/icons
    echo "✅ icons 目录权限已设置为 755"
fi

# ============================================================
# 4. 测试 nginx 配置
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
# 5. 重载 nginx 配置
# ============================================================
echo ""
echo "🔄 重载 nginx 配置..."

nginx -s reload
echo "✅ nginx 配置重载完成"

# ============================================================
# 6. 测试静态文件访问
# ============================================================
echo ""
echo "🌐 测试静态文件访问..."

# 测试 manifest.json
echo "测试 manifest.json："
curl -I http://localhost/manifest.json 2>&1 | head -5

# 测试 police-icon.svg
echo "测试 police-icon.svg："
curl -I http://localhost/icons/police-icon.svg 2>&1 | head -5

echo ""
echo "✅ nginx 配置检查和修复完成！"
echo ""
echo "📋 修复内容："
echo "  - 检查并创建了 nginx 配置文件"
echo "  - 检查并创建了符号链接"
echo "  - 设置了文件权限"
echo "  - 测试并重载了 nginx 配置"
echo ""
echo "🔍 验证步骤："
echo "  1. 访问 http://www.zysoo.top/manifest.json"
echo "  2. 访问 http://www.zysoo.top/icons/police-icon.svg"
