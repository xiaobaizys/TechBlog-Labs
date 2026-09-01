import withPWAInit from "next-pwa";

/** @type {import('next-pwa').PWAConfig} */
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // 自定义 Service Worker
  sw: "sw.js",
  // 缓存策略
  runtimeCaching: [
    {
      // 静态资源：Cache First（长期缓存）
      urlPattern: /^https:\/\/.*\.(js|css|woff2?|ttf|eot|otf)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
        },
      },
    },
    {
      // Next.js 静态资源：Cache First
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
        },
      },
    },
    {
      // 图片：Stale While Revalidate（立即展示，后台刷新）
      urlPattern: /\.(png|jpg|jpeg|webp|gif|svg|ico|avif)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "images",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
        },
      },
    },
    {
      // 上传的图片：Stale While Revalidate
      urlPattern: /\/uploads\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "uploads",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 天
        },
      },
    },
    {
      // 博客文章页面：Network First（优先网络，离线回退缓存）
      urlPattern: /\/blog\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "blog-posts",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 1 天
        },
        networkTimeoutSeconds: 5,
      },
    },
    {
      // 标签 API：Stale While Revalidate（不常变化）
      urlPattern: /\/api\/tags/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "api-tags",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60, // 1 小时
        },
      },
    },
    {
      // 项目 API：Stale While Revalidate
      urlPattern: /\/api\/projects/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "api-projects",
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 30 * 60, // 30 分钟
        },
      },
    },
    {
      // 首页背景 API：Stale While Revalidate
      urlPattern: /\/api\/home-backgrounds/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "api-backgrounds",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60, // 1 小时
        },
      },
    },
    {
      // 配置 API：Stale While Revalidate
      urlPattern: /\/api\/config/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "api-config",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 5 * 60, // 5 分钟
        },
      },
    },
    {
      // 其他 API：Network First（优先网络）
      urlPattern: /\/api\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-other",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 分钟
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      // 页面：Network First，失败回退缓存
      urlPattern: /^\/.*$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 1 天
        },
        networkTimeoutSeconds: 10,
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dockerfile 使用 standalone 模式，减小镜像体积
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30天
  },
  experimental: {
    serverComponentsExternalPackages: ["gray-matter", "bcryptjs"],
    // 对大型库做按需引入，减少首屏 bundle 体积
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "recharts",
      "echarts",
      "echarts-for-react",
      "@radix-ui/react-icons",
    ],
  },
  // 重定向规则
  async redirects() {
    return [];
  },
  // 响应头：静态资源长缓存 + 安全头
  async headers() {
    return [
      {
        // 静态资源（/_next/static）长缓存
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // 公共图片长缓存
        source: "/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // 上传图片缓存
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Service Worker（不缓存，确保最新）
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // Manifest（不缓存）
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        // API 响应（短缓存）
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        // 所有页面的安全头
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://api.deepseek.com https://geo.datav.aliyun.com wss:",
              "font-src 'self' data:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

// 开发环境直接导出原配置，避免 next-pwa 5.x 与 Next.js 14 的 webpack chunk 加载冲突
export default process.env.NODE_ENV === "development"
  ? nextConfig
  : withPWA(nextConfig);
