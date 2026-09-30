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
  // altair-static reads its dist/index.html from disk by `__dirname`, which a
  // bundled copy no longer has; it is loaded only under `next dev`.
  serverExternalPackages: ['altair-static'],
  experimental: {
    // Server Fast Refresh re-runs an edited module and its importers but not
    // the GraphQL builder they register on, so an edited GraphQL module adds
    // its fields twice and every request fails until a restart. Off, `next dev`
    // reloads the server's modules from disk after an edit instead
    // (claude-docs/debugging.md).
    turbopackServerFastRefresh: false,
    // `forbidden()` and `src/app/forbidden.tsx`: the `/admin` guard's 403
    // (claude-docs/auth.md, "The admin guard").
    authInterrupts: true,
    // Off for the e2e servers, which share one build directory and so would
    // share a data cache flushed to it (claude-docs/testing.md, "E2E"). Vercel
    // ignores it, keeping its data cache off the function's disk.
    isrFlushToDisk: process.env.NEXT_ISR_FLUSH_TO_DISK !== 'false',
  },
};

export default nextConfig;
