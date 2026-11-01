import type { NextConfig } from 'next';
// oxlint-disable-next-line no-restricted-imports -- a build plugin, not code that runs in the app
import { withWorkflow } from 'workflow/next';
import { securityHeaders } from './src/lib/security-headers';

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
  // Off for the e2e slot servers, whose databases are reseeded under them
  // between spec files: a data cache held across a reseed would answer what
  // the last spec wrote. The compendium-cache server keeps it
  // (claude-docs/db/compendium-cache.md, "In tests").
  ...(process.env.NEXT_DATA_CACHE === 'off' && { cacheMaxMemorySize: 0 }),
  headers: async () => securityHeaders(process.env.NODE_ENV === 'development'),
  experimental: {
    // Off, as Server Fast Refresh would re-run an edited GraphQL module and add its fields to the builder twice, failing every request until a restart
    // (claude-docs/debugging.md).
    turbopackServerFastRefresh: false,
    // Off, so a restart of `next dev` compiles from the files on disk: the
    // dev cache kept on disk since Next 16.1 went on serving an old Sass
    // partial behind `@use` until it was deleted. Builds keep their own cache
    // (claude-docs/debugging.md, "A restart compiles from the files").
    turbopackFileSystemCacheForDev: false,
    // `forbidden()` and `src/app/(shell)/forbidden.tsx`: the `/admin` guard's 403
    // (claude-docs/auth/admin-guard.md, "The admin guard").
    authInterrupts: true,
    // Off for the e2e servers, which share one build directory and so would
    // share a data cache flushed to it (claude-docs/testing/e2e.md, "E2E"). Vercel
    // ignores it, keeping its data cache off the function's disk.
    isrFlushToDisk: process.env.NEXT_ISR_FLUSH_TO_DISK !== 'false',
  },
};

// Compiles the job files ("use workflow" and "use step") and generates the run route under /.well-known/workflow/.
export { nextConfig };
export default withWorkflow(nextConfig);
