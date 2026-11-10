import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// A `.page-with-nav` page with no jump menu keeps its column centred in the frame at every width, while a page
// with a menu still stands the menu left of its sections. 800px is between the phone breakpoint and the width
// that fits a menu column on each side, where an empty menu column once pushed the column right.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** The page's content column (every child but the menu) and its menu, against the frame's content box. */
const measure = (page: Page) =>
  page
    .locator('.page-with-nav')
    .first()
    .evaluate((root) => {
      const frame = root.parentElement!;
      const style = getComputedStyle(frame);
      const outer = frame.getBoundingClientRect();
      const left = outer.left + parseFloat(style.paddingLeft);
      const right = outer.right - parseFloat(style.paddingRight);
      const column = [...root.children].filter((child) => !child.classList.contains('page-nav'));
      const boxes = column.map((child) => child.getBoundingClientRect());
      const menu = root.querySelector(':scope > .page-nav')?.getBoundingClientRect();
      return {
        frame: { left, right },
        column: {
          left: Math.min(...boxes.map((box) => box.left)),
          right: Math.max(...boxes.map((box) => box.right)),
          top: boxes[0]?.top ?? 0,
          count: boxes.length,
        },
        menu: menu && { left: menu.left, right: menu.right, top: menu.top, bottom: menu.bottom },
        sections: [...root.querySelectorAll(':scope > section')].map((section) => {
          const box = section.getBoundingClientRect();
          return { left: box.left, top: box.top };
        }),
      };
    });

const expectCentred = async (page: Page) => {
  const { frame, column, menu } = await measure(page);
  // Why the comparison means something: the page has no menu and draws a column narrower than the frame.
  expect(menu, 'the page has no jump menu').toBeUndefined();
  expect(column.count).toBeGreaterThan(0);
  expect(column.right - column.left).toBeLessThan(frame.right - frame.left - 2);
  expect(Math.abs(column.left - frame.left - (frame.right - column.right))).toBeLessThanOrEqual(1);
};

for (const width of [800, 1280] as const) {
  test(`at ${width}px the support page's column is centred in the frame`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/support');
    await expect(page.getByRole('heading', { level: 1, name: 'Support' })).toBeVisible();
    await expectCentred(page);
  });
}

test('at 800px a support link that opens nothing is centred in the frame', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/support/request');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectCentred(page);
});

test('at 800px the account support tab is centred, and the account tab still stands its menu left of its sections', async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await signInAs(page, 'reader@page-with-nav-layout.test');

  await page.goto('/account/support');
  await expect(page.locator('.page-with-nav .lede')).toBeVisible();
  await expectCentred(page);

  await page.goto('/account');
  await expect(page.locator('.page-with-nav > .page-nav')).toBeVisible();
  const { menu, sections } = await measure(page);
  expect(menu, 'the account tab has a jump menu').toBeDefined();
  expect(sections.length).toBeGreaterThan(0);
  const [first] = sections;
  // Beside, not above: the menu ends left of the first section and runs on below that section's top.
  expect(menu!.right).toBeLessThanOrEqual(first!.left);
  expect(menu!.bottom).toBeGreaterThan(first!.top);
});
