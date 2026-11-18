import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { DESKTOP_WIDTH } from './breakpoints';

// A long address makes the user list wider than its frame, so it scrolls inside the frame. Its visually hidden mark
// labels are absolutely positioned, so unless the frame is their containing block they escape its clip and widen the page.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('the keeper user list scrolls inside its frame and never sideways on the page', async ({
  page,
}) => {
  await page.setViewportSize({ width: DESKTOP_WIDTH, height: 800 });
  await signInAs(page, `${'k'.repeat(90)}@users-overflow.test`, ['discord'], 'admin');
  await page.goto('/keepers/users');
  const frame = page.locator('.data-table-frame').first();
  await expect(frame).toBeVisible();

  const sizes = await page.evaluate(() => {
    const frameEl = document.querySelector('.data-table-frame') as HTMLElement;
    const root = document.documentElement;
    return {
      frameScrolls: frameEl.scrollWidth > frameEl.clientWidth,
      pageScrolls: root.scrollWidth > root.clientWidth,
    };
  });
  // The precondition: the table really is wider than its frame, so a page that fits is the frame's doing.
  expect(sizes.frameScrolls, 'the frame scrolls inside itself').toBe(true);
  expect(sizes.pageScrolls, 'the page scrolls sideways').toBe(false);
});
