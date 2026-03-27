const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@shared/types"],

  typescript: {
    ignoreBuildErrors: true,
  },

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "biefwzrprjqusjynqwus.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },

  // Experimental performance optimizations
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  webpack: (config, { dev }) => {
    // Avoid Windows EBUSY rename races in persistent filesystem cache.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
