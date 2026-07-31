/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/pricing', destination: '/pricing.html' },
    ];
  },
};

export default nextConfig;
