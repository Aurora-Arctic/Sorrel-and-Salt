import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // `make docker-codegen` loads the dev server as `http://sorrel-app:8000`, and
  // `next dev` 403s cross-origin `/_next/*` for every host but localhost — a
  // rejected HMR socket under Turbopack means the page never hydrates.
  allowedDevOrigins: ['sorrel-app'],
  // `next dev` and the e2e webServer's production build would otherwise
  // share `.next/`, and a concurrent dev rebuild can corrupt what e2e is
  // serving; playwright.config.ts sets it.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // monocart-coverage-reports needs .js.map files to attribute V8 coverage;
  // `next dev` never reads the flag.
  productionBrowserSourceMaps: true,
};

export default nextConfig;
