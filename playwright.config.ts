import { defineConfig, devices } from '@playwright/test';
import { e2eDatabaseUrl } from './e2e/database';

// Not the dev server's 8000, so `npm run dev` and an e2e run can sit side by side.
const PORT = 8001;
// A second `next start` over the same build, differing only in having every
// OAuth provider configured — the sign-in page reads credentials per request,
// so its two availability states need two servers.
// claude-docs/components/sign-in-panel.md, "Testing".
const CONFIGURED_PROVIDERS_PORT = 8002;

const PROVIDER_ENV_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'FACEBOOK_CLIENT_ID',
  'FACEBOOK_CLIENT_SECRET',
  'MICROSOFT_CLIENT_ID',
  'MICROSOFT_CLIENT_SECRET',
];

// Blank rather than absent: Next never lets `.env.local` override a variable
// that is already set, even to '', and clientCredentials() treats '' as
// unset. Without this, a developer's real credentials would silently turn the
// default server into the configured one.
const UNCONFIGURED_PROVIDERS = Object.fromEntries(PROVIDER_ENV_VARS.map((name) => [name, '']));
// Enough for a provider to count as configured, and useless to any real
// authorization endpoint — which is why no test may click a provider button
// against this server.
const PLACEHOLDER_PROVIDERS = Object.fromEntries(
  PROVIDER_ENV_VARS.map((name) => [name, `e2e-placeholder-${name.toLowerCase()}`]),
);

// Set only by the `devcontainer` compose service: the browser then runs in
// the `playwright-server` service while the runner stays local, which is why
// `webServer`'s readiness poll stays on `localhost`. claude-docs/testing.md,
// "E2E".
const wsEndpoint = process.env.PLAYWRIGHT_WS_ENDPOINT;
const serverUrl = (port: number) => `http://localhost:${port}`;
// A remote browser cannot resolve the runner's `localhost`; `start` binds
// 0.0.0.0, so the compose service name reaches it.
const browserUrl = (port: number) => (wsEndpoint ? `http://devcontainer:${port}` : serverUrl(port));

const serverEnv = (port: number, providers: Record<string, string>) => ({
  PORT: String(port),
  DATABASE_URL: e2eDatabaseUrl(),
  // Out of `next dev`'s way — see next.config.ts.
  NEXT_DIST_DIR: '.next-e2e',
  ...providers,
});

const CONFIGURED_PROVIDERS_SPEC = /sign-in-configured-providers\.spec\.ts/;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: browserUrl(PORT),
    // On CI a retry filters flake first; locally there is no retry, so the
    // first failure must carry its own evidence.
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: process.env.CI ? 'off' : 'only-on-failure',
    video: process.env.CI ? 'off' : 'retain-on-failure',
    ...(wsEndpoint ? { connectOptions: { wsEndpoint } } : {}),
  },
  // Production build, against `sorrel_e2e` rather than the dev database.
  // Playwright starts these in order, so the second serves the build the
  // first has finished.
  webServer: [
    {
      command: 'npm run build && npm run start',
      url: serverUrl(PORT),
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: serverEnv(PORT, UNCONFIGURED_PROVIDERS),
    },
    {
      command: 'npm run start',
      url: serverUrl(CONFIGURED_PROVIDERS_PORT),
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: serverEnv(CONFIGURED_PROVIDERS_PORT, PLACEHOLDER_PROVIDERS),
    },
  ],
  projects: [
    {
      name: 'chromium',
      testIgnore: CONFIGURED_PROVIDERS_SPEC,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-configured-providers',
      testMatch: CONFIGURED_PROVIDERS_SPEC,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: browserUrl(CONFIGURED_PROVIDERS_PORT),
        // `.btn` transitions background-color; without this a hover scan can
        // sample the colour mid-fade rather than the one a user settles on.
        reducedMotion: 'reduce',
      },
    },
  ],
});
