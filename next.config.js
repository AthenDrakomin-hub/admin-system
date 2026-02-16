/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel 免费版优化
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // 限制请求体大小
    },
  },
  
  // 压缩优化
  compress: true,
  
  // 图片优化 - 添加remotePatterns缓解安全漏洞
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // 允许所有HTTPS域名（根据实际需求调整）
        pathname: '**',
      },
    ],
  },

  // 所有/admin下面的页面永远动态，永远不要预渲染
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
