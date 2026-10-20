import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import {
  COMPENDIUM_CACHE_PORT,
  CONFIGURED_PROVIDERS_PORT,
  E2E_SLOTS,
  auditWsEndpoint,
  browserUrl,
  wsEndpoint,
} from './tests/e2e/slots';
import { allServers } from './tests/e2e/servers';

const CONFIGURED_PROVIDERS_SPEC = /sign-in-configured-providers\.spec\.ts/;

const COMPENDIUM_CACHE_SPEC = /compendium-cache\.spec\.ts/;

// The story suite (M9.1) has its own config, playwright.stories.config.ts, and
// its own job in pr-gate.yml. A project's own `testIgnore` replaces a top-level one
// rather than adding to it, so each project that matches everything under
// `testDir` lists this itself; `npm run e2e` never runs a story.
const STORIES_SPECS = /[\\/]stories[\\/]/;

// The workshop specs measure a component in its Ladle story, against the
// workshop server alone: playwright.workshop.config.ts runs them, `npm run
// e2e` never does.
const WORKSHOP_SPECS = /[\\/]workshop[\\/]/;

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
    // first failure must carry its own evidence: the trace, which holds a
    // screenshot and a DOM snapshot per action, and the final screenshot.
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: process.env.CI ? 'off' : 'only-on-failure',
    // Never a video, locally either (M11.18): recording every test cost a tenth
    // to a sixth of the summed test time, measured, and was encoded on the
    // browser server, which shares these cores, for a failure the trace already
    // shows (claude-docs/testing/e2e.md, "Where a run's time goes").
    video: 'off',
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
  // Under Claude Code the html report alone prints no failure text, so a dot
  // line is added and html stays (MB.142, M12.37). CI and the host are unchanged.
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
