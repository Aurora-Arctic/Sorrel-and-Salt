import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';

// Between the phone breakpoint and the width that fits a menu column each side, the jump menu gives up width to the
// text rather than holding its full column while the text is squeezed (the About Us page).

/** The most of the row the menu may take once the text column is the narrower of the two. */
const MENU_SHARE = 0.36;

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

for (const width of [700, 768, 820, 900, 1000, 1100, 1300]) {
  test(`at ${width}px the menu on the About Us page leaves most of the width to the text`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about');
    await expect(page.locator('.page-with-nav > .page-nav')).toBeVisible();

    const { root, menu, text } = await page.evaluate(() => {
      const rootElement = document.querySelector('.page-with-nav')!;
      const box = (element: Element) => {
        const { left, right, width: size } = element.getBoundingClientRect();
        return { left, right, width: size };
      };
      const body = [...rootElement.querySelectorAll(':scope > *')].filter(
        (child) =>
          !child.classList.contains('page-nav') && child.getBoundingClientRect().height > 0,
      );
      const widest = body.reduce((a, b) =>
        b.getBoundingClientRect().width > a.getBoundingClientRect().width ? b : a,
      );
      return {
        root: box(rootElement),
        menu: box(rootElement.querySelector(':scope > .page-nav')!),
        text: box(widest),
      };
    });

    // Why the comparison means something: the menu stands beside the text, not above it.
    expect(menu.right).toBeLessThanOrEqual(text.left + 1);
    // From the width that fits a menu column each side the menu is a side track of three, so its share is of the whole row only below that.
    if (width < 1200) expect(menu.width / root.width).toBeLessThanOrEqual(MENU_SHARE);
    expect(text.width).toBeGreaterThan(menu.width);
  });
}
