import { resolve } from 'node:path';
import {
  COMPENDIUM_CACHE_DATABASE,
  CONFIGURED_PROVIDERS_DATABASE,
  e2eDatabaseUrl,
  slotDatabase,
} from './database';
import { PRIMARY_ADMIN_EMAIL } from './session';
import {
  COMPENDIUM_CACHE_PORT,
  CONFIGURED_PROVIDERS_PORT,
  E2E_SLOTS,
  serverUrl,
  slotPort,
} from './slots';

// The servers an e2e run needs, defined once so that playwright.config.ts, playwright.stories.config.ts
// and scripts/e2e-servers.ts (`npm run e2e:servers`, which leaves them running between runs) start the
// same servers with the same environment.

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

// Blank rather than absent: Next never lets `.env.local` override a variable that is already set, and
// clientCredentials() treats '' as unset, so a developer's real credentials cannot turn this server into
// the configured one.
const UNCONFIGURED_PROVIDERS = Object.fromEntries(PROVIDER_ENV_VARS.map((name) => [name, '']));
// Enough for a provider to count as configured, and useless to any real
// authorization endpoint — which is why no test may click a provider button
// against this server.
const PLACEHOLDER_PROVIDERS = Object.fromEntries(
  PROVIDER_ENV_VARS.map((name) => [name, `e2e-placeholder-${name.toLowerCase()}`]),
);

// Answers the server's breached-password checks, so no e2e run calls the real Have I Been Pwned service.
// Resolved from the repository root, where Playwright and `npm run e2e:servers` both start.
const PWNED_RANGE_PRELOAD = resolve('tests/e2e/pwned-range-preload.mjs');

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
  // Plain cookie names on every e2e server, so a browser on a plain-http origin sends the session cookie `signInAs`
  // puts in its jar, and keeps it through a redirect (src/lib/e2e-session-cookie.ts). A test-environment switch only.
  E2E_PLAIN_SESSION_COOKIE: 'true',
  // Off, set rather than left absent: Next never lets `.env.local` override a set variable, and a developer's
  // `ENABLE_IMPERSONATION=true` would add an Impersonate button the specs do not expect (claude-docs/auth/impersonation.md).
  ENABLE_IMPERSONATION: 'false',
  // CI's placeholder, here too, so a developer's own address in `.env.local` never names the primary
  // admin a spec signs in as.
  ADMIN_BOOTSTRAP_EMAIL: PRIMARY_ADMIN_EMAIL,
  // Set, not appended to: a developer's own NODE_OPTIONS has no place in a test server.
  NODE_OPTIONS: `--import ${PWNED_RANGE_PRELOAD}`,
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

// One more `next start` over the same build with every OAuth provider configured (the sign-in page reads
// credentials per request) and a database of its own, so no slot reseeds it.
// claude-docs/components/sign-in-panel.md, "Testing".
const configuredProvidersServer = {
  command: 'npm run start',
  url: serverUrl(CONFIGURED_PROVIDERS_PORT),
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
  env: serverEnv(CONFIGURED_PROVIDERS_PORT, CONFIGURED_PROVIDERS_DATABASE, PLACEHOLDER_PROVIDERS),
};

// One more, whose data cache holds: the one place a spec sees a read answered from the cache rather
// than Postgres. Its database is its own and never reseeded, since a reseed would leave the cache behind it.
const compendiumCacheServer = {
  command: 'npm run start',
  url: serverUrl(COMPENDIUM_CACHE_PORT),
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
  env: serverEnv(COMPENDIUM_CACHE_PORT, COMPENDIUM_CACHE_DATABASE, UNCONFIGURED_PROVIDERS, {
    dataCache: true,
  }),
};

/** Every server a full run needs, in the order Playwright starts them. */
export const allServers = [...slotServers, configuredProvidersServer, compendiumCacheServer];
