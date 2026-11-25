import type { NextConfig } from 'next';
import type { RemotePattern } from 'next/dist/shared/lib/image-config';

const IMAGE_DOMAINS = process.env.NEXT_PUBLIC_IMAGE_DOMAINS;

// Vercel demo: the dev backend's CORS allowlist does not include *.vercel.app, so the browser
// calls /real-api on the demo's own domain and Vercel forwards it to the backend server-side.
// On Vercel both API base URLs default to the production domain unless set explicitly.
const REAL_API_PROXY_TARGET =
  process.env.REAL_API_PROXY_TARGET || 'https://api.dev.fitness-v2.okamoto-hd.com';
const VERCEL_DOMAIN = process.env.VERCEL_PROJECT_PRODUCTION_URL;
if (VERCEL_DOMAIN) {
  process.env.NEXT_PUBLIC_REAL_API_URL ||= `https://${VERCEL_DOMAIN}/real-api`;
  process.env.NEXT_PUBLIC_API_URL ||= `https://${VERCEL_DOMAIN}/api`;
}
const REAL_API_URL =
  process.env.NEXT_PUBLIC_REAL_API_URL || 'https://api.dev.fitness-v2.okamoto-hd.com';

// Store photos (Y-02): the real API's signed media asset route, on NEXT_PUBLIC_REAL_API_URL's host
// (store-image-url.util.ts) — a different host per environment, fixed at build time.
function realApiAssetPatterns(): RemotePattern[] {
  const url = new URL(REAL_API_URL);
  return [
    {
      protocol: url.protocol === 'http:' ? 'http' : 'https',
      hostname: url.hostname,
      port: url.port,
      pathname: `${url.pathname.replace(/\/+$/, '')}/api/v1/media/assets/**`,
    },
  ];
}

const nextConfig: NextConfig = {
  ...(VERCEL_DOMAIN && {
    env: {
      NEXT_PUBLIC_REAL_API_URL: process.env.NEXT_PUBLIC_REAL_API_URL!,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL!,
    },
  }),
  async rewrites() {
    return [{ source: '/real-api/:path*', destination: `${REAL_API_PROXY_TARGET}/:path*` }];
  },
  output: 'standalone',
  // Mock API routes read these via process.cwd(), which standalone's tracing cannot see.
  outputFileTracingIncludes: {
    '/api/**/*': ['./src/lib/openapi.json', './src/app/api/_mock-db/assets/**'],
  },
  webpack(config) {
    const fileLoaderRule = config.module.rules.find((rule: any) => rule.test?.test?.('.svg'));

    config.module.rules.push(
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/,
      },
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] },
        use: ['@svgr/webpack'],
      },
    );

    fileLoaderRule.exclude = /\.svg$/i;
    return config;
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // Replaces the deprecated `images.domains`: any protocol/path on each listed host
      ...(IMAGE_DOMAINS?.split(',').map((item) => ({ hostname: item.trim() })) ?? []),
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      ...realApiAssetPatterns(),
    ],
  },
};

export default nextConfig;
