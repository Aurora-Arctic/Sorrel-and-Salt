import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import {
  COMPENDIUM_CACHE_DATABASE,
  CONFIGURED_PROVIDERS_DATABASE,
  e2eDatabaseUrl,
  slotDatabase,
} from './tests/e2e/database';
import { PRIMARY_ADMIN_EMAIL } from './tests/e2e/session';
import {
  COMPENDIUM_CACHE_PORT,
  CONFIGURED_PROVIDERS_PORT,
  E2E_SLOTS,
  auditWsEndpoint,
  browserUrl,
  plainSessionCookie,
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

const serverEnv = (
  port: number,
  database: string,
  providers: Record<string, string>,
  { dataCache = false } = {},
) => ({
  PORT: String(port),
  DATABASE_URL: e2eDatabaseUrl(database),
  // Out of `next dev`'s way — see next.config.ts.
  NEXT_DIST_DIR: '.next-e2e',
  // Every server serves that one build directory, so a data cache flushed to
  // it would hand one slot's cached reads to another slot's server.
  NEXT_ISR_FLUSH_TO_DISK: 'false',
  // Under the audit alone, plain cookie names, so WebKit sends the session
  // cookie `signInAs` puts in its jar over the plain-http origin a remote
  // browser uses (src/lib/e2e-session-cookie.ts, MB.255).
  ...(plainSessionCookie && { E2E_PLAIN_SESSION_COOKIE: 'true' }),
  // Off, set rather than left absent: Next never lets `.env.local` override a
  // variable that is already set, and a developer's `ENABLE_IMPERSONATION=true`
  // would add an Impersonate button and a table column the specs do not expect
  // (tests/e2e/admin.spec.ts; claude-docs/auth/impersonation.md).
  ENABLE_IMPERSONATION: 'false',
  // CI's placeholder, here too, so a developer's own address in `.env.local`
  // never names the primary admin a spec signs in as (MB.59).
  ADMIN_BOOTSTRAP_EMAIL: PRIMARY_ADMIN_EMAIL,
  // And held in no memory either, but on the compendium-cache server: a slot's
  // database is reseeded under its server, which a cache would not follow
  // (claude-docs/db/compendium-cache.md, "In tests").
  ...(!dataCache && { NEXT_DATA_CACHE: 'off' }),
  ...providers,
});

// The first slot's server builds; Playwright starts the entries in order, so
// every later one serves the build the first has finished.
export const slotServers = Array.from({ length: E2E_SLOTS }, (_, slot) => ({
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

// One more, whose data cache holds (M8.6): the one place a spec sees a read
// answered from the cache rather than Postgres. Its database is its own and
// never reseeded, since a reseed would leave the cache behind it.
const compendiumCacheServer = {
  command: 'npm run start',
  url: serverUrl(COMPENDIUM_CACHE_PORT),
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
  env: serverEnv(COMPENDIUM_CACHE_PORT, COMPENDIUM_CACHE_DATABASE, UNCONFIGURED_PROVIDERS, {
    dataCache: true,
  }),
};

const COMPENDIUM_CACHE_SPEC = /compendium-cache\.spec\.ts/;

// The story suite (M9.1) has its own config, playwright.stories.config.ts, and
// its own CI workflow. A project's own `testIgnore` replaces a top-level one
// rather than adding to it, so each project that matches everything under
// `testDir` lists this itself; `npm run e2e` never runs a story.
const STORIES_SPECS = /[\\/]stories[\\/]/;

// The audit (M10.25): the suite in WebKit, Firefox and as a phone, on demand
// and never on CI, which stays Chromium alone. The three projects exist only
// under `E2E_AUDIT=1` (`npm run e2e:audit`), so `npm run e2e` is unchanged
// whatever the environment holds. They dial the `playwright-audit` compose
// service, Microsoft's image, through an endpoint of its own, since the
// shared `use` already names the Chromium server; each ignores the two specs
// that run on their own ports, as `chromium` does, and names no base URL, so
// tests/e2e/fixtures.ts gives each worker its own slot's server as it does
// there (claude-docs/testing/e2e.md, "The audit"). The phone is a real iPhone
// profile, touch and mobile viewport included, rather than the 375px window
// the Chromium scans use: `iPhone 15`, the oldest in Playwright's list whose
// iOS is on or above the browser floor's iOS Safari 17.4 (M10.24;
// `iPhone 14` reports 16.0). The axe scans still run under it.
const AUDIT = process.env.E2E_AUDIT === '1';
if (AUDIT && !auditWsEndpoint)
  throw new Error(
    "E2E_AUDIT=1 needs PLAYWRIGHT_AUDIT_WS_ENDPOINT, the playwright-audit service's address: " +
      '.devcontainer/docker-compose.yml sets it, and `make playwright-audit-up` starts the service.',
  );
const auditProject = (name: string, device: (typeof devices)[string]) => ({
  name,
  testIgnore: [CONFIGURED_PROVIDERS_SPEC, COMPENDIUM_CACHE_SPEC, STORIES_SPECS],
  use: { ...device, connectOptions: { wsEndpoint: auditWsEndpoint! } },
});
const auditProjects = AUDIT
  ? [
      auditProject('webkit', devices['Desktop Safari']),
      auditProject('firefox', devices['Desktop Firefox']),
      auditProject('phone', devices['iPhone 15']),
    ]
  : [];

// Every output under .reports/ with the rest of the generated files. The
// reporter list lives here rather than on CI's command line because a CLI
// `--reporter` replaces this list and with it the html report's folder.
export const HTML_REPORT = { outputFolder: '.reports/playwright-report', open: 'never' } as const;

// What the e2e config and the story config (playwright.stories.config.ts) share:
// where output goes, how many workers, the setup and teardown that reseed the
// slot databases, and the browser options.
export const baseConfig = {
  outputDir: '.reports/test-results',
  fullyParallel: true,
  // One per slot server; tests/e2e/slots.ts.
  workers: E2E_SLOTS,
  forbidOnly: !!process.env.CI,
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
} satisfies PlaywrightTestConfig;

export default defineConfig({
  ...baseConfig,
  testDir: './tests/e2e',
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['json'], ['html', HTML_REPORT]] : [['html', HTML_REPORT]],
  // Production build, against the e2e databases rather than the dev one.
  webServer: [...slotServers, configuredProvidersServer, compendiumCacheServer],
  projects: [
    {
      name: 'chromium',
      testIgnore: [CONFIGURED_PROVIDERS_SPEC, COMPENDIUM_CACHE_SPEC, STORIES_SPECS],
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
    {
      name: 'chromium-compendium-cache',
      testMatch: COMPENDIUM_CACHE_SPEC,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: browserUrl(COMPENDIUM_CACHE_PORT),
      },
    },
    ...auditProjects,
  ],
});
