import type { Locator } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { seedCoven, withSql } from './stories/coven-ingredients';
import { openAddIngredient } from './stories/ingredient-dialogs';
import { signInAs } from './session';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';

// Every tip stays on screen at the narrowest phone: the Add Ingredient dialog's tips at 320px, and the formal
// name's on both entry pages at 390px.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test.use({ viewport: { width: 320, height: 640 } });

type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

/**
 * The tip's box once its fade and first placement have settled: two polled reads in a row that agree,
 * rather than a fixed sleep.
 */
async function settledBox(tip: Locator): Promise<Box | null> {
  const read: { last: string; box: Box | null } = { last: '', box: null };
  await expect
    .poll(async () => {
      read.box = await tip.boundingBox();
      const now = JSON.stringify(read.box);
      const same = read.box !== null && now === read.last;
      read.last = now;
      return same;
    })
    .toBe(true);
  return read.box;
}

test('every tip in the Add Ingredient dialog opens inside a 320px viewport', async ({ page }) => {
  await seedCoven(page, 'Fixture Coven Tips', 'tip-placement.test', { A: 'owner' });
  await page.goto('/account');
  const dialog = await openAddIngredient(page);
  // A New Reference panel, for its How to Cite tip at the head's end edge:
  // the tip measured against the right of the viewport.
  await dialog.getByRole('combobox', { name: 'Reference' }).click();
  await page.getByRole('option', { name: 'New Reference' }).click();
  await expect(dialog.getByRole('group', { name: 'New Reference' })).toBeVisible();

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
    const box = await settledBox(tip);
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

// The formal name's ⓘ heads a coven's entry page and the public one, and opens below on a phone, where the
// shell's sticky bar would cover a tip above (claude-docs/components/ingredient-entry.md, "The formal name is
// never blank").
test('the formal name\u2019s tip opens inside a 390px viewport on a coven\u2019s page and the public page', async ({
  page,
  browser,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const coven = await seedCoven(page, 'Fixture Coven Formal Tip', 'formal-tip.test', {
    A: 'owner',
  });
  const admin = await browser.newPage({ baseURL });
  let ingredientId: string;
  try {
    const { userId } = await signInAs(admin, 'admin@formal-tip.test', ['discord'], 'admin');
    ingredientId = await withSql(async (sql) => {
      const id = await insertIngredient(
        sql,
        makeIngredient({
          name: 'Fixture Tipwort',
          canonicalName: 'Fixtura monstrata',
          nomenclature: 'botanical',
        }),
        userId,
      );
      await insertCupboardEntry(sql, { workspaceId: coven.id, ingredientId: id }, coven.users.A);
      return id;
    });
  } finally {
    await admin.close();
  }
  const [{ slug }] = await withSql(
    (sql) => sql<{ slug: string }[]>`select slug from ingredients where id = ${ingredientId}`,
  );

  for (const address of [
    `/coven/${coven.slug}/ingredients/${ingredientId}`,
    `/compendium/ingredients/${slug}`,
  ]) {
    await page.goto(address);
    const button = page.getByRole('button', { name: 'About Botanical Name' });
    // Why the check could fail: the page draws the formal name's ⓘ.
    await expect(button).toBeVisible();
    await button.focus();
    const tip = page.getByRole('tooltip');
    await expect(tip).toBeVisible();
    const box = await settledBox(tip);
    if (!box) throw new Error(`The tip on ${address} has no box`);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
  }

  // The same ⓘ in the Quick Look window, which scrolls under a clipped dialog: the tip must
  // stay inside the viewport there too, below the ⓘ on a phone and beside it on a wide screen.
  for (const [width, height] of [
    [390, 844],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`/compendium?entry=${ingredientId}`);
    const dialog = page.getByRole('dialog', { name: 'Fixture Tipwort' });
    await expect(dialog).toBeVisible();
    const button = dialog.getByRole('button', { name: 'About Botanical Name' });
    // Why the check could fail: the window draws the formal name's ⓘ.
    await expect(button).toBeVisible();
    await button.focus();
    const tip = page.getByRole('tooltip').filter({ hasText: 'Its botanical name' });
    await expect(tip).toBeVisible();
    const box = await settledBox(tip);
    if (!box) throw new Error(`The Quick Look tip at ${width}px has no box`);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
    // Escape closes the tip, not the window.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
  }
});
