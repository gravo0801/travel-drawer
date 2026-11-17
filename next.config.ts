import type { NextConfig } from "next";
const config: NextConfig = {
  images: { unoptimized: true },
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/dashboard/index.html" }], afterFiles: [], fallback: [] };
  },
};
export default config;
