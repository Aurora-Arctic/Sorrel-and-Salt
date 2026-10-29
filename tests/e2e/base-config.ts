import type { PlaywrightTestConfig } from '@playwright/test';
import { E2E_SLOTS, wsEndpoint } from './slots';

// What the three Playwright configs share, in a module that builds nothing on import: playwright.config.ts
// imports tests/e2e/servers.ts, which builds every slot server's `DATABASE_URL` as it loads, and the
// workshop config must load with no database setting at all, as on CI's `workshop` job.

// Every output under .reports/ with the rest of the generated files. The
// reporter list lives in each config rather than on CI's command line because
// a CLI `--reporter` replaces it and with it the html report's folder.
export const HTML_REPORT = { outputFolder: '.reports/playwright-report', open: 'never' } as const;

// What the e2e and story configs share: where output goes, the worker count, the setup and teardown that
// reseed the slot databases, and the browser options. The workshop config takes only the output folder,
// `forbidOnly` and browser options.
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
    // Never a video, locally either: recording every test cost a tenth to a sixth of the summed test
    // time, measured, and was encoded on the browser server, which shares these cores, for a failure
    // the trace already shows (claude-docs/testing/e2e.md, "Where a run's time goes").
    video: 'off',
    ...(wsEndpoint ? { connectOptions: { wsEndpoint } } : {}),
    // `.btn` transitions its colours; without this an axe scan can sample
    // one mid-fade — on hover, or as a Save button enables — rather than the
    // colour a user settles on.
    reducedMotion: 'reduce',
  },
} satisfies PlaywrightTestConfig;
