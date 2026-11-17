import type { NextConfig } from "next";
const config: NextConfig = {
  images: { unoptimized: true },
  // 첫 주소는 여행 블로그, 개인 대시보드는 /me (로그인 필요)
  async redirects() {
    return [
      { source: "/blog", destination: "/", permanent: false },
      { source: "/dashboard", destination: "/me", permanent: false },
      { source: "/dashboard/:path*", destination: "/me", permanent: false },
    ];
  },
};
export default config;
