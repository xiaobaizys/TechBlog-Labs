#!/bin/bash
# TechBlog-Labs nginx 静态文件配置修复脚本
# 使用方法：在服务器上执行 bash fix-nginx-static.sh

set -e

echo "🔧 开始修复 nginx 静态文件配置..."

# ============================================================
# 1. 检查 nginx 是否安装
# ============================================================
if ! command -v nginx &> /dev/null; then
    echo "❌ nginx 未安装，请先安装 nginx"
    exit 1
fi

# ============================================================
# 2. 创建 nginx 配置文件
# ============================================================
echo "📝 创建 nginx 配置文件..."

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

# ============================================================
# 3. 启用配置
# ============================================================
echo "🔗 启用 nginx 配置..."

# 创建符号链接
ln -sf /etc/nginx/sites-available/techblog /etc/nginx/sites-enabled/

# 删除默认配置（如果存在）
rm -f /etc/nginx/sites-enabled/default

# ============================================================
# 4. 测试并重载 nginx
# ============================================================
echo "🔍 测试 nginx 配置..."

if nginx -t; then
    echo "✅ nginx 配置测试通过"
    echo "🔄 重载 nginx 配置..."
    nginx -s reload
    echo "✅ nginx 配置重载完成"
else
    echo "❌ nginx 配置测试失败"
    exit 1
fi

# ============================================================
# 5. 验证修复
# ============================================================
echo ""
echo "🔍 验证修复..."

# 测试 manifest.json
echo "测试 manifest.json："
curl -I http://localhost/manifest.json 2>&1 | head -3

# 测试 police-icon.svg
echo "测试 police-icon.svg："
curl -I http://localhost/icons/police-icon.svg 2>&1 | head -3

echo ""
echo "✅ nginx 静态文件配置修复完成！"
echo ""
echo "📋 修复内容："
echo "  - 创建了 nginx 配置文件"
echo "  - 配置了静态文件直接由 nginx 服务"
echo "  - 重载了 nginx 配置"
echo ""
echo "🔍 验证步骤："
echo "  1. 访问 http://www.zysoo.top/manifest.json"
echo "  2. 访问 http://www.zysoo.top/icons/police-icon.svg"
