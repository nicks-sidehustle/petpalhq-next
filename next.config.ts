import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Track 1 Phase C (2026-04-15): network-portable infrastructure.
  // @omc/config + @omc/schema ship as TypeScript source in vendored
  // tarballs; Next's default externalization of node_modules would leave
  // them untranspiled, so surface them to Turbopack here.
  transpilePackages: ['@omc/schema', '@omc/config'],

  // Redirects for slug variants we don't author but inbound traffic hits.
  // Add rows here when new 404 patterns surface in the watchdog or analytics.
  async redirects() {
    return [
      {
        source: '/guides/best-automatic-cat-feeders-2026',
        destination: '/guides/best-automatic-pet-feeders-2026',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
