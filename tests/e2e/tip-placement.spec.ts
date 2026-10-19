import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { seedCoven } from './stories/coven-ingredients';
import { openAddIngredient } from './stories/ingredient-dialogs';

// Every tip stays on screen (M8.14, amended 2026-10-18). No story walks this:
// it is a layout fact at the narrowest phone, so this gate opens the tips of
// the Add Ingredient dialog at 320px and measures each one's box.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test.use({ viewport: { width: 320, height: 640 } });

test('every tip in the Add Ingredient dialog opens inside a 320px viewport', async ({ page }) => {
  await seedCoven(page, 'Fixture Coven Tips', 'tip-placement.test', { A: 'owner' });
  await page.goto('/account');
  const dialog = await openAddIngredient(page);

  const buttons = dialog.getByRole('button', { name: /^About / });
  const count = await buttons.count();
  // Why the check could fail: there are tips to open, and they sit across the
  // width, some near each edge.
  expect(count).toBeGreaterThan(1);

  const edges: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    await button.scrollIntoViewIfNeeded();
    await button.focus();
    const tip = page.getByRole('tooltip');
    await expect(tip).toHaveCount(1);
    await expect(tip).toBeVisible();
    // Let the fade and the first position settle before measuring.
    await page.waitForTimeout(300);
    const box = await tip.boundingBox();
    const at = await button.boundingBox();
    if (!box || !at) throw new Error('A tip or its button has no box');
    edges.push(at.x);
    test.info().annotations.push({
      type: 'box',
      description: `button x=${Math.round(at.x)} tip x=${Math.round(box.x)} right=${Math.round(box.x + box.width)}`,
    });
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    expect(box.y).toBeGreaterThanOrEqual(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    // Escape closes the tip, not the dialog.
    await expect(dialog).toBeVisible();
  }
  // Both a left-hand and a right-hand tip were measured.
  expect(Math.min(...edges)).toBeLessThan(160);
  expect(Math.max(...edges)).toBeGreaterThan(160);
});
