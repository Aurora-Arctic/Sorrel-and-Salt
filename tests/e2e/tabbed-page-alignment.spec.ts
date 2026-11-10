import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven } from './stories/coven-ingredients';
import type { Coven } from './stories/coven-ingredients';

// The tab row of a tabbed page stays at the start of the heading's line (or of the line beneath it) at every width, never
// pushed to the end beside the action. 712px is where the heading once grew to fill the line.

/** The largest gap the row may keep from the heading it sits beside, in pixels: the header's own column gap and a margin of error. */
const BESIDE_GAP = 28;

let coven: Coven;

test.beforeAll(async ({ browser }) => {
  await recreateE2eDatabase();
  const setup = await browser.newPage();
  try {
    coven = await seedCoven(setup, 'Fixture Coven Tabs', 'tabbed-page-alignment.test', {
      A: 'owner',
    });
  } finally {
    await setup.close();
  }
});

for (const width of [400, 500, 560, 600, 680, 700, 712, 720, 800, 1000, 1280]) {
  test(`at ${width}px the Grimoire's tab row is left aligned`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAgainAs(page, coven.users.A);
    await page.goto(`/coven/${coven.slug}/grimoire`);
    await expect(page.locator('.tabbed-page__tabs')).toBeVisible();

    const { header, heading, tabs, action } = await page.evaluate(() => {
      const box = (element: Element | null) => {
        const { left, right, top, bottom } = element!.getBoundingClientRect();
        return { left, right, top, bottom };
      };
      // The heading's words, not its box, which can be wider than they are.
      const textBox = (element: Element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const { left, right, top, bottom } = range.getBoundingClientRect();
        return { left, right, top, bottom };
      };
      const head = document.querySelector('.tabbed-page > .page-header')!;
      return {
        header: box(head),
        heading: textBox(head.querySelector('h1')!),
        tabs: box(head.querySelector('.tabbed-page__tabs')),
        action: box(head.querySelector('.tabbed-page__action')),
      };
    });

    // Why the comparison means something: the action stands at the end of the line, so a row pushed to the end would be far from the heading.
    expect(header.right - action.right).toBeLessThanOrEqual(1);
    const beneath = tabs.top >= heading.bottom - 1;
    if (beneath) {
      expect(Math.abs(tabs.left - header.left)).toBeLessThanOrEqual(1);
    } else {
      expect(tabs.left - heading.right).toBeGreaterThanOrEqual(0);
      expect(tabs.left - heading.right).toBeLessThanOrEqual(BESIDE_GAP);
    }
  });
}
