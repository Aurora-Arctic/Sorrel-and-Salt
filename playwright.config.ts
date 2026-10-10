import { defineConfig, devices } from '@playwright/test';
import { CONFIGURED_PROVIDERS_DATABASE, e2eDatabaseUrl, slotDatabase } from './tests/e2e/database';
import { PRIMARY_ADMIN_EMAIL } from './tests/e2e/session';
import {
  CONFIGURED_PROVIDERS_PORT,
  E2E_SLOTS,
  browserUrl,
  serverUrl,
  slotPort,
  wsEndpoint,
} from './tests/e2e/slots';

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

const serverEnv = (port: number, database: string, providers: Record<string, string>) => ({
  PORT: String(port),
  DATABASE_URL: e2eDatabaseUrl(database),
  // Out of `next dev`'s way — see next.config.ts.
  NEXT_DIST_DIR: '.next-e2e',
  // Every server serves that one build directory, so a data cache flushed to
  // it would hand one slot's cached reads to another slot's server.
  NEXT_ISR_FLUSH_TO_DISK: 'false',
  // CI's placeholder, here too, so a developer's own address in `.env.local`
  // never names the primary admin a spec signs in as (MB.59).
  ADMIN_BOOTSTRAP_EMAIL: PRIMARY_ADMIN_EMAIL,
  ...providers,
});

// The first slot's server builds; Playwright starts the entries in order, so
// every later one serves the build the first has finished.
const slotServers = Array.from({ length: E2E_SLOTS }, (_, slot) => ({
  command: slot === 0 ? 'npm run build && npm run start' : 'npm run start',
  url: serverUrl(slotPort(slot)),
  reuseExistingServer: !process.env.CI,
  timeout: slot === 0 ? 180_000 : 60_000,
  env: serverEnv(slotPort(slot), slotDatabase(slot), UNCONFIGURED_PROVIDERS),
}));

// One more `next start` over the same build, differing only in having every
// OAuth provider configured — the sign-in page reads credentials per request,
// so its two availability states need two servers — and in a database of its
// own, since whichever slot ran beside it would otherwise reseed it.
// claude-docs/components/sign-in-panel.md, "Testing".
const configuredProvidersServer = {
  command: 'npm run start',
  url: serverUrl(CONFIGURED_PROVIDERS_PORT),
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
  env: serverEnv(CONFIGURED_PROVIDERS_PORT, CONFIGURED_PROVIDERS_DATABASE, PLACEHOLDER_PROVIDERS),
};

const CONFIGURED_PROVIDERS_SPEC = /sign-in-configured-providers\.spec\.ts/;

// Every output under .reports/ with the rest of the generated files. The
// reporter list lives here rather than on CI's command line because a CLI
// `--reporter` replaces this list and with it the html report's folder.
const HTML_REPORT = { outputFolder: '.reports/playwright-report', open: 'never' } as const;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: '.reports/test-results',
  fullyParallel: true,
  // One per slot server; tests/e2e/slots.ts.
  workers: E2E_SLOTS,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['json'], ['html', HTML_REPORT]] : [['html', HTML_REPORT]],
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  // No `baseURL` here: tests/e2e/fixtures.ts gives each worker its own slot's
  // server wherever a project names none.
  use: {
    // On CI a retry filters flake first; locally there is no retry, so the
    // first failure must carry its own evidence.
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: process.env.CI ? 'off' : 'only-on-failure',
    video: process.env.CI ? 'off' : 'retain-on-failure',
    ...(wsEndpoint ? { connectOptions: { wsEndpoint } } : {}),
    // `.btn` transitions its colours; without this an axe scan can sample
    // one mid-fade — on hover, or as a Save button enables — rather than the
    // colour a user settles on.
    reducedMotion: 'reduce',
  },
  // Production build, against the e2e databases rather than the dev one.
  webServer: [...slotServers, configuredProvidersServer],
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
      },
    },
  ],
});
