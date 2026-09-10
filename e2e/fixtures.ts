import { test as base, type Page } from '@playwright/test';
import MCR from 'monocart-coverage-reports';
import coverageOptions from './coverage.config';

// Coverage API is Chromium-only; every spec still imports `test`/`expect`
// from here (not `@playwright/test` directly) so this auto fixture runs for
// every test without each spec opting in individually.
export const test = base.extend<{ coverageAutoFixture: string }>({
  coverageAutoFixture: [
    async ({ context }, use) => {
      const isChromium = test.info().project.name === 'chromium';

      // JS only — CSS coverage has no sourcemap path back to its Sass
      // source (unlike next.config.ts's productionBrowserSourceMaps for JS),
      // so it can only ever report against opaque bundled chunk names.
      // There's no Sass test story to hold accountable to a line-coverage
      // number, so it's not collected rather than reported and ignored.
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
        // A test that never navigates (e.g. `page.setContent`) collects no
        // entries — MCR logs a warning for an empty array, so skip it.
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
