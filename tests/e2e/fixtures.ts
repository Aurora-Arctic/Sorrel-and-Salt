import { test as base, type Page } from '@playwright/test';
import MCR from 'monocart-coverage-reports';
import coverageOptions from './coverage.config';

// Every spec imports `test`/`expect` from here so this auto fixture runs for
// every test.
export const test = base.extend<{ coverageAutoFixture: string }>({
  coverageAutoFixture: [
    async ({ context }, use) => {
      const isChromium = test.info().project.name === 'chromium';

      // JS only: CSS coverage has no sourcemap path back to Sass.
      // claude-docs/testing.md, "Coverage".
      const startCoverage = async (page: Page) => {
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
      };

      if (isChromium) {
        context.on('page', startCoverage);
      }

      await use('coverageAutoFixture');

      if (isChromium) {
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
