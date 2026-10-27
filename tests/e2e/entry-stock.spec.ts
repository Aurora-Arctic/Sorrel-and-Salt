import { test, expect } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import {
  compendiumVariant,
  insertStock,
  markDocument,
  seedCoven,
  stillSameDocument,
  stockEditor,
  withSql,
} from './stories/coven-ingredients';

// The entry page's Stock section (M12.29). Story 24 walks Edit Stock from the card and
// Quick Look; no story walks it from the entry's own page, so this gate does: a shelf of
// jars, one per form, with each held jar's amount (a low or empty one's a tip button), Edit Stock in
// the heading and on a jar by keyboard, and nothing of another coven's jars. An own entry's
// jar, a viewer's page without Edit Stock, and an unheld entry with no Stock section are the
// entry page test's (tests/app/(shell)/coven/ingredient.test.tsx).

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const stockOf = (page: Page) => page.getByRole('region', { name: 'Stock' });
// A jar on the shelf, found by its form. A form of the entry the coven holds no jar of is
// on the shelf too, so no count of the jars is asserted: the entry's forms are the
// compendium's to change.
const lineOf = (page: Page, form: string) =>
  stockOf(page).getByRole('listitem').filter({ hasText: form });
// A Low or Out jar's amount is the button that opens its tip, named for the amount and the
// state ("5 g, Low Stock"), not the card's boxed badge, so the story helpers do not find it.
const lowAmount = (line: Locator) => line.getByRole('button', { name: /, Low Stock$/ });
const outAmount = (line: Locator) => line.getByRole('button', { name: /, Out of Stock$/ });

test('a coven’s entry pages list its jars under Stock, and Edit Stock in the heading changes them', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Entry Stock', 'entry-stock.test', {
    A: 'owner',
  });
  const other = await seedCoven(page, 'Fixture Coven Elsewhere', 'entry-stock-other.test', {
    D: 'owner',
  });
  const { rosemary } = await withSql(async (sql) => {
    const herb = await compendiumVariant(sql, 'Rosemary', 'Herb');
    const oil = await compendiumVariant(sql, 'Rosemary', 'Oil');
    await insertStock(
      sql,
      coven.id,
      herb,
      { quantity: 5, unit: 'g', threshold: 10 },
      coven.users.A,
    );
    await insertStock(sql, coven.id, oil, { quantity: 0, unit: 'ml', threshold: 5 }, coven.users.A);
    // The other coven's jar of the same compendium entry, an amount the coven's own lines never read.
    await insertStock(
      sql,
      other.id,
      herb,
      { quantity: 999, unit: 'g', threshold: 1 },
      other.users.D,
    );
    return { rosemary: herb.ingredientId };
  });
  const pageOf = (id: string) => `/coven/${coven.slug}/ingredients/${id}`;
  await signInAgainAs(page, coven.users.A);

  await test.step('a cupboard entry shelves a jar per form, each held one with its amount, a low or empty one with its tip button', async () => {
    await page.goto(pageOf(rosemary));
    await expect(stockOf(page).getByRole('list', { name: 'Jars' })).toBeVisible();
    await expect(lineOf(page, 'Herb')).toContainText('5 g');
    await expect(lowAmount(lineOf(page, 'Herb'))).toBeVisible();
    await expect(outAmount(lineOf(page, 'Herb'))).toHaveCount(0);
    await expect(lineOf(page, 'Oil')).toContainText('0 ml');
    await expect(outAmount(lineOf(page, 'Oil'))).toBeVisible();
    // The other coven's jar of the same entry is its own.
    await expect(stockOf(page)).not.toContainText('999');
  });

  await test.step('Edit Stock opens from the heading by keyboard, and a save shows on the lines', async () => {
    await markDocument(page);
    const editor = stockEditor(stockOf(page), 'Rosemary');
    await editor.open.focus();
    await page.keyboard.press('Enter');
    // The dialog opens on its first jar, in no set order, so Herb is chosen first, by keyboard.
    await editor.dialog.getByRole('button', { name: /^Herb\b/ }).focus();
    await page.keyboard.press('Enter');
    const herb = editor.jar('Herb');
    await expect(herb.quantity).toHaveValue('5');
    await herb.quantity.fill('50');
    await editor.save.focus();
    await page.keyboard.press('Enter');

    await expect(editor.dialog).toHaveCount(0);
    await expect(editor.open).toBeFocused();
    await expect(lineOf(page, 'Herb')).toContainText('50 g');
    await expect(lowAmount(lineOf(page, 'Herb'))).toHaveCount(0);
    expect(await stillSameDocument(page)).toBe(true);
  });

  await test.step('a jar is a button too: Enter on it opens Edit Stock on that form, and Escape gives the focus back', async () => {
    const oil = stockOf(page).getByRole('button', {
      name: 'Edit Stock, Rosemary, Salvia rosmarinus, Oil',
      exact: true,
    });
    await oil.focus();
    await page.keyboard.press('Enter');

    const editor = stockEditor(stockOf(page), 'Rosemary');
    await expect(editor.dialog).toBeVisible();
    await expect(editor.dialog.getByRole('button', { name: /^Oil\b/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(editor.jar('Oil').quantity).toHaveValue('0');
    await page.keyboard.press('Escape');
    await expect(editor.dialog).toHaveCount(0);
    await expect(oil).toBeFocused();
  });

  await test.step('at a phone’s width the section is axe-clean and scrolls nowhere sideways', async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await assertNoSidewaysScroll(page, { restore: true });
    await assertNoAccessibilityViolations(page);
  });
});
