import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "https://maslahatchi.humora.uz"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
