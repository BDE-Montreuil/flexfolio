import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Every distinct (source × width × quality × format) is a separate
    // billed transformation, so keep each list as short as the layouts
    // actually need: a single format and quality, and a handful of widths
    // instead of the 15 defaults. 2560 matches MAX_EDGE in
    // src/lib/compress-image.ts — nothing larger is ever stored.
    formats: ["image/webp"],
    qualities: [75],
    deviceSizes: [640, 1080, 1920, 2560],
    imageSizes: [384],
    // Storage paths embed a uuid and are never overwritten, so an
    // optimized variant stays valid forever — don't let it expire after
    // the 4h default and get re-transformed.
    minimumCacheTTL: 31536000,
  },
};

export default nextConfig;
