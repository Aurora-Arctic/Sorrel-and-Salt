import { defineConfig, devices } from '@playwright/test';
import { HTML_REPORT, baseConfig } from './tests/e2e/base-config';
import {
  COMPENDIUM_CACHE_PORT,
  CONFIGURED_PROVIDERS_PORT,
  auditWsEndpoint,
  browserUrl,
} from './tests/e2e/slots';
import { allServers } from './tests/e2e/servers';

const CONFIGURED_PROVIDERS_SPEC = /sign-in-configured-providers\.spec\.ts/;

const COMPENDIUM_CACHE_SPEC = /compendium-cache\.spec\.ts/;

// The story suite has its own config, playwright.stories.config.ts, and
// its own job in pr-gate.yml. A project's own `testIgnore` replaces a top-level one
// rather than adding to it, so each project that matches everything under
// `testDir` lists this itself; `npm run e2e` never runs a story.
const STORIES_SPECS = /[\\/]stories[\\/]/;

// The workshop specs measure a component in its Storybook story, against the
// workshop server alone: playwright.workshop.config.ts runs them, `npm run
// e2e` never does.
const WORKSHOP_SPECS = /[\\/]workshop[\\/]/;

// The audit: the suite in WebKit, Firefox and as a phone, on demand and never on CI. The three projects exist only under `E2E_AUDIT=1` (`npm run e2e:audit`),
// dial the `playwright-audit` compose service through an endpoint of their own, and name no base URL, so each worker gets its own slot's server
// (claude-docs/testing/e2e.md, "The audit"). The phone is `iPhone 15`, the oldest profile whose iOS meets the browser floor's iOS Safari 17.4.
const AUDIT = process.env.E2E_AUDIT === '1';
if (AUDIT && !auditWsEndpoint)
  throw new Error(
    "E2E_AUDIT=1 needs PLAYWRIGHT_AUDIT_WS_ENDPOINT, the playwright-audit service's address: " +
      '.devcontainer/docker-compose.yml sets it, and `make playwright-audit-up` starts the service.',
  );
// Shared with the story config (playwright.stories.config.ts), which runs the
// stories in the same three browsers under the same flag and passes no
// `testIgnore`, since it has none of the two ports' specs to leave out.
export const auditProjects = (testIgnore?: RegExp[]) =>
  AUDIT
    ? [
        ['webkit', devices['Desktop Safari']],
        ['firefox', devices['Desktop Firefox']],
        ['phone', devices['iPhone 15']],
      ].map(([name, device]) => ({
        name: name as string,
        ...(testIgnore ? { testIgnore } : {}),
        use: {
          ...(device as (typeof devices)[string]),
          connectOptions: { wsEndpoint: auditWsEndpoint! },
        },
      }))
    : [];

export default defineConfig({
  ...baseConfig,
  testDir: './tests/e2e',
  retries: process.env.CI ? 2 : 0,
  // Under Claude Code the html report alone prints no failure text, so a dot
  // line is added and html stays. CI and the host are unchanged.
  reporter: process.env.CI
    ? [['list'], ['json'], ['html', HTML_REPORT]]
    : process.env.CLAUDECODE
      ? [['dot'], ['html', HTML_REPORT]]
      : [['html', HTML_REPORT]],
  // Production build, against the e2e databases rather than the dev one.
  webServer: allServers,
  projects: [
    {
      name: 'chromium',
      testIgnore: [CONFIGURED_PROVIDERS_SPEC, COMPENDIUM_CACHE_SPEC, STORIES_SPECS, WORKSHOP_SPECS],
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
    ...auditProjects([
      CONFIGURED_PROVIDERS_SPEC,
      COMPENDIUM_CACHE_SPEC,
      STORIES_SPECS,
      WORKSHOP_SPECS,
    ]),
  ],
});
