/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 允许的远程图片源（coverImage / 头像 / 生活分享等）
    // 已支持 https://** 全域名 + 任意 path，
    // 这里额外列出明确的几家常见服务，方便运维时快速定位
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // 封面图常用尺寸
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // 列表卡片缩略图常用尺寸
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 输出格式：优先 AVIF，回退 WebP（需 sharp 支持）
    formats: ["image/avif", "image/webp"],
    // 输出格式：默认 next/image 会自动 webp / avif
    // 不强制 minimumCacheTTL，next 默认最长 1 年
  },
  // 实验性功能
  experimental: {
    serverComponentsExternalPackages: ["gray-matter", "bcryptjs"],
  },
};

export default nextConfig;
