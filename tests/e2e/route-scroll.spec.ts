import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// A move to another page lands at the top. With `scroll-behavior: smooth` (src/app/globals.scss), Next's own
// jump glides and stops 40-62px short unless <html> carries `data-scroll-behavior="smooth"`; only a real
// browser shows it.

// The suite runs under reduced motion (playwright.config.ts), which turns the
// smooth scrolling off and with it the bug; this is the one spec that needs it on.
test.use({ reducedMotion: 'no-preference' });

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
];

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

for (const { name, ...viewport } of VIEWPORTS) {
  test(`at a ${name}'s width, going from an admin page to the Compendium lands at the top`, async ({
    page,
  }) => {
    await signInAs(page, `admin-${name}@route-scroll.test`, ['discord'], 'admin');
    await page.setViewportSize(viewport);
    await page.goto('/admin/categories');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Down the page first, as a reader who has been reading it would be.
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    if (viewport.width < 600) {
      // The bar's site links fold into the account menu at a phone's width.
      await page.getByRole('banner').getByRole('button', { name: 'Fixture Person' }).click();
      await page
        .getByRole('link', { name: 'Compendium' })
        .and(page.locator('[href="/compendium"]'))
        .click();
    } else {
      await page
        .getByRole('navigation', { name: 'Site' })
        .getByRole('link', { name: 'Compendium' })
        .click();
    }
    await expect(page.getByRole('heading', { level: 1, name: 'Compendium' })).toBeVisible();

    // Sampled well after arrival: the glide, when it is the bug, ends there.
    for (const wait of [500, 500]) {
      await page.waitForTimeout(wait);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    }
  });
}
