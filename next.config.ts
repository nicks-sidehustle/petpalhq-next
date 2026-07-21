import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // One slow page must not kill the whole deploy: the default 60s static-generation
  // limit failed the 2026-07-03 production build when the guide corpus hit 142
  // (root cause fixed via getAllGuides() memoization; this is the safety margin).
  staticPageGenerationTimeout: 180,
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
        // 2026-07-22 content audit: /playground section index retired from nav;
        // the Playground-category guides remain live under /guides/*.
        source: '/playground',
        destination: '/guides',
        permanent: true,
      },
      {
        source: '/guides/best-automatic-cat-feeders-2026',
        destination: '/guides/best-automatic-pet-feeders-2026',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
