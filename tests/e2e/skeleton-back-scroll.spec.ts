import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { holdServerAnswers } from './hold-server-answers';

// The skeleton scrolls the window to the top when it shows, yet Back still lands where the reader left: on the
// origin's own scroll position, with the link they pressed in view. Checked from a long public list and a long
// keeper list, each left from far down while the server's answer is held so the skeleton draws.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** Waits until React has hydrated the element, so a click is the app's navigation and not a full page load. */
const hydrated = (page: Page, selector: string) =>
  page.waitForFunction((target) => {
    const element = document.querySelector(target);
    return !!element && Object.keys(element).some((key) => key.startsWith('__reactProps$'));
  }, selector);

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

const origins: readonly { name: string; from: string; link: (page: Page) => Locator }[] = [
  {
    name: 'the compendium, from its last card',
    from: '/compendium',
    link: (page) => page.getByRole('main').locator('a[href^="/compendium/ingredients/"]').last(),
  },
  {
    name: 'the curator compendium list, from the footer',
    from: '/curator/compendium',
    link: (page) => page.locator('footer').getByRole('link', { name: 'Privacy', exact: true }),
  },
];

const VARIANTS = [
  { width: 1280, theme: 'light' },
  { width: 375, theme: 'light' },
] as const;

for (const [index, origin] of origins.entries()) {
  for (const { width, theme } of VARIANTS) {
    test(`Back to ${origin.name} at ${width}px ${theme} restores the scroll position`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
      await page.emulateMedia({ colorScheme: theme });
      await signInAs(
        page,
        `admin-${index}-${width}@skeleton-back-scroll.test`,
        ['discord'],
        'admin',
      );
      const server = await holdServerAnswers(page);
      expect((await page.goto(origin.from))?.status()).toBe(200);
      const title = await page.locator('h1').first().textContent();
      expect(title).toBeTruthy();

      const link = origin.link(page);
      await link.evaluate((element) => element.setAttribute('data-back-scroll-link', ''));
      await hydrated(page, '[data-back-scroll-link]');
      await link.scrollIntoViewIfNeeded();
      const before = await scrollY(page);
      // Why Back could land wrong: the origin is really scrolled, far from its top.
      expect(before).toBeGreaterThan(300);

      server.hold();
      await link.click();
      await expect.poll(() => server.held()).toBeGreaterThan(0);
      // Why Back could land wrong: the skeleton really drew, and it really took the window to the top.
      await expect(page.locator('.skeleton-cover')).toHaveCount(1);
      await expect.poll(() => scrollY(page)).toBe(0);

      await server.release();
      await expect(page.locator('.skeleton-cover')).toHaveCount(0, { timeout: 20_000 });
      await expect(page.locator('.skeleton-fade')).toHaveCount(0);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page).not.toHaveURL(new RegExp(`${origin.from}$`));

      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${origin.from}$`));
      await expect(page.locator('h1').first()).toHaveText(title!);
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      // Waits for the position to settle, then asserts it with both numbers in the message.
      let after = await scrollY(page);
      await expect
        .poll(async () => Math.abs((after = await scrollY(page)) - before))
        .toBeLessThanOrEqual(5)
        .catch(() => undefined);
      expect(
        Math.abs(after - before),
        `recorded scrollY ${before}, scrollY after Back ${after}`,
      ).toBeLessThanOrEqual(5);
      await expect(origin.link(page)).toBeInViewport();
    });
  }
}
