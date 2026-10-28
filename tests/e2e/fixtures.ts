import { test as base, type Page } from '@playwright/test';
import MCR from 'monocart-coverage-reports';
import coverageOptions, { coverageRequested } from './coverage.config';
import { currentSlot, slotUrl } from './slots';

// Every spec imports `test`/`expect` from here so these fixtures run for
// every test.
// The projects that run in Chromium: the gate suite's `chromium` and the story
// suite's `stories` (playwright.stories.config.ts). Matching the first alone
// left the story suite with no coverage at all (M14.28).
const CHROMIUM_PROJECTS = new Set(['chromium', 'stories']);

export const test = base.extend<{ coverageAutoFixture: string }, { slot: number }>({
  // Automatic, so a worker past the last slot server fails every test it runs,
  // including one that never opens a page. The empty pattern is Playwright's:
  // it reads a fixture's dependencies off its first parameter.
  // oxlint-disable-next-line no-empty-pattern
  slot: [async ({}, use) => use(currentSlot()), { scope: 'worker', auto: true }],

  // A project that names its own server keeps it; every other test reaches its
  // worker's slot server, which reads the database its reseed and `signInAs`
  // write.
  baseURL: async ({ baseURL, slot }, use) => {
    await use(baseURL ?? slotUrl(slot));
  },

  coverageAutoFixture: [
    async ({ context, javaScriptEnabled }, use) => {
      // Chromium alone has the coverage API, and only a run that asked for it
      // pays for it (coverage.config.ts). A test that turns script off is
      // skipped: there is nothing to cover, and the debugger coverage needs
      // refuses to start on such a page.
      const collecting =
        coverageRequested && javaScriptEnabled && CHROMIUM_PROJECTS.has(test.info().project.name);

      // JS only: CSS coverage has no sourcemap path back to Sass.
      // claude-docs/testing/coverage.md, "Coverage".
      const startCoverage = async (page: Page) => {
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
      };

      if (collecting) {
        context.on('page', startCoverage);
      }

      await use('coverageAutoFixture');

      if (collecting) {
        context.off('page', startCoverage);
        const coverageList = await Promise.all(
          context.pages().map((page) => page.coverage.stopJSCoverage()),
        );
        const flatCoverage = coverageList.flat();
        // A test that never navigates collects nothing, and MCR warns on an empty array.
        if (flatCoverage.length > 0) {
          const mcr = MCR(coverageOptions);
          await mcr.add(flatCoverage);
        }
      }
    },
    { scope: 'test', auto: true },
  ],
});

export { expect } from '@playwright/test';
