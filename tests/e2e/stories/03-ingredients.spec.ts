import type { Page } from '@playwright/test';
import type postgres from 'postgres';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from '../axe';
import { recreateE2eDatabase } from '../database';
import {
  type Coven,
  type Stock,
  applyFilters,
  cardsIn,
  chipChoice,
  chooseChip,
  compendiumVariant,
  filterOf,
  ingredientList,
  insertStock,
  localBadge,
  localIngredient,
  lowBadge,
  markDocument,
  nameSearch,
  openFilters,
  outBadge,
  pickCategory,
  rowOf,
  searchCovenList,
  seedCoven,
  stillSameDocument,
  stockEditor,
  withSql,
} from './coven-ingredients';

// Stories 20–27: the coven's ingredient list at /coven/[slug]/ingredients,
// and everything a member does from it. The page is M9.6's, and stories 20,
// 21, 22 and 27 walk it; each scaffold still marked `fixme` waits on the
// task named in its annotation, which turns it into `test` and makes it
// pass. Each story writes its own coven, so one story's rows never decide
// another's counts.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** A seeded compendium entry the coven holds, by label, form and, for a shared label, formal name. */
interface Jar extends Stock {
  name: string;
  form: string;
  canonicalName?: string;
}

/** Stocks each of `jars` in `coven`, written by its first user. */
async function stockJars(sql: postgres.Sql, coven: Coven, jars: Jar[]): Promise<string[]> {
  const author = Object.values(coven.users)[0];
  const ids: string[] = [];
  for (const { name, form, canonicalName, ...stock } of jars) {
    const held = await compendiumVariant(sql, name, form, canonicalName);
    ids.push(await insertStock(sql, coven.id, held, stock, author));
  }
  return ids;
}

/** A coven with one owner, signed in, on its ingredient list. */
async function ownCoven(page: Page, story: number) {
  const coven = await seedCoven(page, `Fixture Coven Story ${story}`, `story-${story}.test`, {
    A: 'owner',
  });
  return coven;
}

function listPath(coven: Coven) {
  return `/coven/${coven.slug}/ingredients`;
}

test(
  "the coven's list holds its own ingredients and its compendium stock together, each with its forms",
  { tag: '@story-20' },
  async ({ page }) => {
    const coven = await ownCoven(page, 20);
    await withSql(async (sql) => {
      const testwort = await localIngredient(sql, coven.id, coven.users.A);
      await insertStock(
        sql,
        coven.id,
        testwort,
        { quantity: 4, unit: 'piece', threshold: 3 },
        coven.users.A,
      );
      // A local entry with no jar of it yet is listed too (M6.18 names its case).
      await localIngredient(sql, coven.id, coven.users.A, {
        name: 'Fixture Unstocked',
        nomenclature: 'none',
      });
      await stockJars(sql, coven, [
        { name: 'Rosemary', form: 'Herb', quantity: 20, unit: 'g', threshold: 10 },
        {
          name: "Cat's Claw",
          form: 'Bark',
          canonicalName: 'Uncaria tomentosa',
          quantity: 30,
          unit: 'g',
          threshold: 10,
        },
        { name: 'Selenite', form: 'Crystal', quantity: 2, unit: 'piece', threshold: 1 },
      ]);
    });

    const response = await page.goto(listPath(coven));
    expect(response?.status()).toBe(200);
    const list = ingredientList(page);
    const cards = cardsIn(list);

    await test.step('every entry is in the one list, in label order', async () => {
      // Sorted on (lower(name), identity_key, id), M8.14's order.
      const order = ["Cat's Claw", 'Fixture Unstocked', 'Rosemary', 'Selenite', 'Testwort'];
      await expect(cards).toHaveCount(order.length);
      for (const [index, name] of order.entries()) {
        await expect(cards.nth(index)).toContainText(name);
      }
    });

    await test.step('each shows its form, and a shared label its formal name', async () => {
      await expect(rowOf(list, 'Rosemary')).toContainText('Herb');
      await expect(rowOf(list, 'Selenite')).toContainText('Crystal');
      await expect(rowOf(list, 'Testwort')).toContainText('Root');
      await expect(rowOf(list, "Cat's Claw")).toContainText('Uncaria tomentosa');
      await expect(rowOf(list, "Cat's Claw")).toContainText('Bark');
    });

    await test.step('each stocked entry shows its jar, by quantity and unit', async () => {
      await expect(rowOf(list, 'Testwort')).toContainText('4 piece');
      await expect(rowOf(list, 'Rosemary')).toContainText('20 g');
      await expect(rowOf(list, "Cat's Claw")).toContainText('30 g');
      await expect(rowOf(list, 'Selenite')).toContainText('2 piece');
    });

    await test.step('the local entries are badged and the compendium stock is not', async () => {
      await expect(localBadge(rowOf(list, 'Testwort'))).toBeVisible();
      await expect(localBadge(rowOf(list, 'Fixture Unstocked'))).toBeVisible();
      await expect(localBadge(rowOf(list, 'Rosemary'))).toHaveCount(0);
      await expect(localBadge(rowOf(list, "Cat's Claw"))).toHaveCount(0);
    });

    await test.step('the coven nav marks Ingredients as the page, and the page passes axe at 375px', async () => {
      // M9.6 adds the Ingredients row to CovenNav (claude-docs/components/coven-nav.md).
      await expect(
        page.getByRole('navigation', { name: 'Coven' }).getByRole('link', { name: 'Ingredients' }),
      ).toHaveAttribute('aria-current', 'page');
      await assertNoAccessibilityViolations(page);
      await assertNoSidewaysScroll(page);
    });
  },
);

test(
  'searching the list by name, folk name or formal name narrows it to what the coven holds',
  { tag: '@story-21' },
  async ({ page }) => {
    const coven = await ownCoven(page, 21);
    await withSql((sql) =>
      stockJars(sql, coven, [
        { name: 'Comfrey', form: 'Leaf', quantity: 20, unit: 'g', threshold: 10 },
        { name: 'Mugwort', form: 'Herb', quantity: 20, unit: 'g', threshold: 10 },
        { name: "Devil's Shoestring", form: 'Root', quantity: 3, unit: 'piece', threshold: 1 },
        { name: 'Selenite', form: 'Crystal', quantity: 2, unit: 'piece', threshold: 1 },
      ]),
    );
    await page.goto(listPath(coven));
    const list = ingredientList(page);
    const cards = cardsIn(list);
    // Why each search narrows: the coven holds four.
    await expect(cards).toHaveCount(4);

    for (const [text, found, by] of [
      ['Comfrey', 'Comfrey', 'its name'],
      ['knitbone', 'Comfrey', 'a folk name, in another case'],
      ['Devil Shoestrings', "Devil's Shoestring", 'its folk name'],
      ['Symphytum officinale', 'Comfrey', 'its formal name'],
    ] as const) {
      await test.step(`"${text}" finds ${found} by ${by}`, async () => {
        await searchCovenList(page, text);
        await expect(cards).toHaveCount(1);
        await expect(rowOf(list, found)).toBeVisible();
        expect(new URL(page.url()).search).not.toBe('');
      });
    }

    await test.step('a compendium entry the coven does not hold is not found', async () => {
      // Sweet Bay is Bay Laurel's folk name; the coven holds no Bay Laurel.
      await searchCovenList(page, 'Sweet Bay');
      await expect(cards).toHaveCount(0);
    });

    await test.step('clearing the search brings the whole list back', async () => {
      // The search box's own clear empties it and applies the empty search
      // (claude-docs/components/ingredient-search.md).
      await filterOf(page).getByRole('button', { name: 'Clear Name' }).click();
      await expect(cards).toHaveCount(4);
      await expect(nameSearch(page)).toHaveValue('');
      expect(new URL(page.url()).search).toBe('');
      await assertNoAccessibilityViolations(page);
    });
  },
);

test(
  'several categories at once keep only the entries filed under every one, and the address keeps the filter',
  { tag: '@story-22' },
  async ({ page }) => {
    const coven = await ownCoven(page, 22);
    // Protection: Rosemary and Bay Laurel. Cleansing: Rosemary, Selenite and
    // Sea Salt. Both: Rosemary alone (the seed's categories, src/db/seed/).
    await withSql((sql) =>
      stockJars(sql, coven, [
        { name: 'Rosemary', form: 'Herb', quantity: 20, unit: 'g', threshold: 10 },
        { name: 'Bay Laurel', form: 'Leaf', quantity: 20, unit: 'g', threshold: 10 },
        { name: 'Selenite', form: 'Crystal', quantity: 2, unit: 'piece', threshold: 1 },
        { name: 'Sea Salt', form: 'Salt', quantity: 200, unit: 'g', threshold: 10 },
      ]),
    );
    await page.goto(listPath(coven));
    const list = ingredientList(page);
    const cards = cardsIn(list);
    await expect(cards).toHaveCount(4);

    await test.step('one category keeps every entry filed under it', async () => {
      const panel = await openFilters(page);
      await pickCategory(panel, 'Protection');
      await applyFilters(page, panel);
      await expect(cards).toHaveCount(2);
      await expect(rowOf(list, 'Rosemary')).toBeVisible();
      await expect(rowOf(list, 'Bay Laurel')).toBeVisible();
    });

    await test.step('a second keeps only the entries under both', async () => {
      const panel = await openFilters(page);
      await pickCategory(panel, 'Cleansing');
      await applyFilters(page, panel);
      await expect(cards).toHaveCount(1);
      await expect(rowOf(list, 'Rosemary')).toBeVisible();
      expect(new URL(page.url()).search).not.toBe('');
      await assertNoAccessibilityViolations(page);
    });

    await test.step('a reload restores the view, both picks still shown', async () => {
      await page.reload();
      await expect(cards).toHaveCount(1);
      await expect(rowOf(list, 'Rosemary')).toBeVisible();
      // A pick is a chip with its own Remove (claude-docs/components/category-picker.md).
      const panel = await openFilters(page);
      for (const name of ['Protection', 'Cleansing']) {
        await expect(panel.getByRole('button', { name: `Remove Category: ${name}` })).toBeVisible();
      }
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
    });

    await test.step('Back steps to the one-category view', async () => {
      await page.goBack();
      await expect(cards).toHaveCount(2);
      await expect(rowOf(list, 'Bay Laurel')).toBeVisible();
    });
  },
);

test(
  'low and out-of-stock rows are badged apart, by a threshold the row shows and edits, which zero turns off',
  { tag: '@story-23' },
  async ({ page }) => {
    const coven = await ownCoven(page, 23);
    const [, , seleniteId] = await withSql(async (sql) => {
      const testwort = await localIngredient(sql, coven.id, coven.users.A);
      await insertStock(
        sql,
        coven.id,
        testwort,
        { quantity: 2, unit: 'piece', threshold: 3 },
        coven.users.A,
      );
      return stockJars(sql, coven, [
        // Out: nothing left.
        { name: 'Rosemary', form: 'Herb', quantity: 0, unit: 'g', threshold: 10 },
        // Low at the threshold itself, not only below it.
        { name: 'Sea Salt', form: 'Salt', quantity: 10, unit: 'g', threshold: 10 },
        // Well stocked.
        { name: 'Selenite', form: 'Crystal', quantity: 5, unit: 'piece', threshold: 3 },
        // Low under the weight default of 10 g, spared by its zero threshold.
        { name: 'Bay Laurel', form: 'Leaf', quantity: 1, unit: 'g', threshold: 0 },
      ]);
    });
    await page.goto(listPath(coven));
    const list = ingredientList(page);

    await test.step('below or at the threshold reads low, zero reads out, and never both', async () => {
      for (const name of ['Testwort', 'Sea Salt']) {
        await expect(lowBadge(rowOf(list, name))).toBeVisible();
        await expect(outBadge(rowOf(list, name))).toHaveCount(0);
      }
      await expect(outBadge(rowOf(list, 'Rosemary'))).toBeVisible();
      await expect(lowBadge(rowOf(list, 'Rosemary'))).toHaveCount(0);
      for (const name of ['Selenite', 'Bay Laurel']) {
        await expect(rowOf(list, name)).toBeVisible();
        await expect(lowBadge(rowOf(list, name))).toHaveCount(0);
        await expect(outBadge(rowOf(list, name))).toHaveCount(0);
      }
      // Each badge is a drawing alone, named in full for a screen reader, and its
      // tip says the state in words: not a colour alone. Axe holds their contrast.
      await outBadge(rowOf(list, 'Rosemary')).focus();
      await expect(page.getByRole('tooltip')).toHaveText('Out of Stock');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('tooltip')).toHaveCount(0);
      await lowBadge(rowOf(list, 'Sea Salt')).focus();
      await expect(page.getByRole('tooltip')).toContainText('Low Stock · 10 g');
      await expect(page.getByRole('tooltip')).toContainText('Low at 10 g or less');
      await page.keyboard.press('Escape');
      await assertNoAccessibilityViolations(page);
    });

    await test.step('the low-stock filter keeps the low rows, in the address', async () => {
      // M9.8's `lowStockOnly`, a switch as the admin's Without References is
      // (claude-docs/components/compendium-list.md); "Low Stock Only" is this spec's choice.
      const panel = await openFilters(page);
      await panel.getByRole('switch', { name: 'Low Stock Only' }).click();
      await applyFilters(page, panel);
      await expect(rowOf(list, 'Testwort')).toBeVisible();
      await expect(rowOf(list, 'Sea Salt')).toBeVisible();
      await expect(rowOf(list, 'Selenite')).toHaveCount(0);
      await expect(rowOf(list, 'Bay Laurel')).toHaveCount(0);
      expect(new URL(page.url()).search).not.toBe('');
      await page.reload();
      await expect(rowOf(list, 'Sea Salt')).toBeVisible();
      await expect(rowOf(list, 'Selenite')).toHaveCount(0);
    });

    // Pending: this step presses the card's pencil. Edit Stock left the cards (the owner's call, 2026-10-20) and comes back in the Quick Look and on the entry page, where it returns.
    await test.step.skip(
      'the threshold shows on the row, and raising it makes the row low',
      async () => {
        await page.goto(listPath(coven));
        const row = rowOf(list, 'Selenite');
        const editor = stockEditor(row, 'Selenite', 'Crystal');
        await editor.open.click();
        await expect(editor.threshold).toHaveValue('3');
        await editor.threshold.fill('5');
        await editor.save.click();

        await expect(lowBadge(row)).toBeVisible();
        const [stock] = await withSql(
          (sql) => sql<{ threshold: number }[]>`
          select low_stock_threshold::float as threshold from inventory_items where id = ${seleniteId}`,
        );
        expect(stock.threshold).toBe(5);
      },
    );
  },
);

/** A stock row's quantity, unit and threshold as the database holds them. */
async function stockOf(id: string) {
  const [row] = await withSql(
    (sql) => sql<{ quantity: number; unit: string; threshold: number }[]>`
      select quantity_on_hand::float as quantity, unit, low_stock_threshold::float as threshold
      from inventory_items where id = ${id}`,
  );
  return row;
}

// Pending as a whole: every step presses the card's pencil. Edit Stock left the cards (the owner's call, 2026-10-20) and comes back in the Quick Look and on the entry page,
// and this returns with it, steps unchanged.
test.fixme(
  'quantity, unit and threshold are edited on the row, by mouse or keyboard, and a failed save rolls back and says so',
  {
    tag: '@story-24',
    annotation: {
      type: 'fixme',
      description:
        'Edit Stock leaves the cards; it returns in the Quick Look and on the entry page',
    },
  },
  async ({ page }) => {
    const coven = await ownCoven(page, 24);
    const { testwortStock, rosemaryStock } = await withSql(async (sql) => {
      const testwort = await localIngredient(sql, coven.id, coven.users.A);
      const testwortStock = await insertStock(
        sql,
        coven.id,
        testwort,
        { quantity: 4, unit: 'piece', threshold: 3 },
        coven.users.A,
      );
      const [rosemaryStock] = await stockJars(sql, coven, [
        { name: 'Rosemary', form: 'Herb', quantity: 20, unit: 'g', threshold: 10 },
      ]);
      return { testwortStock, rosemaryStock };
    });
    const path = listPath(coven);
    await page.goto(path);
    const list = ingredientList(page);
    await expect(rowOf(list, 'Rosemary')).toBeVisible();
    await markDocument(page);

    await test.step('all three are changed and saved without leaving the page', async () => {
      const editor = stockEditor(rowOf(list, 'Rosemary'), 'Rosemary', 'Herb');
      await editor.open.click();
      await editor.quantity.fill('0.5');
      // Within the dimension: weight to weight (CLAUDE.md, unit conversion).
      await editor.pickUnit('kg');
      await editor.threshold.fill('0.1');
      await editor.save.click();

      await expect(editor.quantity).toHaveCount(0);
      await expect(editor.open).toBeVisible();
      expect(await stockOf(rosemaryStock)).toEqual({ quantity: 0.5, unit: 'kg', threshold: 0.1 });
      expect(new URL(page.url()).pathname).toBe(path);
      expect(await stillSameDocument(page)).toBe(true);
      await assertNoAccessibilityViolations(page);
    });

    await test.step('the keyboard alone opens, edits, saves and cancels', async () => {
      const editor = stockEditor(rowOf(list, 'Testwort'), 'Testwort', 'Root');
      await editor.open.focus();
      await page.keyboard.press('Enter');
      // Opening moves the focus into the first field, Quantity.
      await expect(editor.quantity).toBeFocused();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.type('6');
      await page.keyboard.press('Enter');

      await expect(editor.quantity).toHaveCount(0);
      // Closing hands the focus back to what opened it.
      await expect(editor.open).toBeFocused();
      expect(await stockOf(testwortStock)).toEqual({ quantity: 6, unit: 'piece', threshold: 3 });

      await page.keyboard.press('Enter');
      await expect(editor.quantity).toBeFocused();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.type('9');
      // An edit not yet saved is asked about first: the question opens on
      // Keep Editing, and Shift+Tab reaches Discard Changes before it.
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Keep Editing' })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(page.getByRole('button', { name: 'Discard Changes' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(editor.quantity).toHaveCount(0);
      await expect(editor.open).toBeFocused();
      expect(await stockOf(testwortStock)).toEqual({ quantity: 6, unit: 'piece', threshold: 3 });
    });

    await test.step('a save that fails puts the row back and explains', async () => {
      // The network fails the write and nothing else, so the page's own
      // reads still answer: a failure the member could meet on a train.
      await page.route('**/api/graphql', (route) =>
        route.request().postData()?.includes('mutation') ? route.abort('failed') : route.continue(),
      );
      const row = rowOf(list, 'Rosemary');
      const editor = stockEditor(row, 'Rosemary', 'Herb');
      await editor.open.click();
      await editor.quantity.fill('99');
      await editor.save.click();

      await expect(editor.dialog.getByRole('alert')).toBeVisible();
      await expect(row).not.toContainText('99');
      expect(await stockOf(rosemaryStock)).toEqual({ quantity: 0.5, unit: 'kg', threshold: 0.1 });
      expect(await stillSameDocument(page)).toBe(true);
      await page.unrouteAll();
    });
  },
);

test.fixme(
  "a delete asks first, naming the item and whether it deletes the coven's ingredient or only its jar; Cancel keeps it, Delete removes the row in place",
  {
    tag: '@story-25',
    annotation: { type: 'fixme', description: 'M9.10 builds the delete and its confirmation' },
  },
  async ({ page }) => {
    const coven = await ownCoven(page, 25);
    const { testwort, rosemaryStock } = await withSql(async (sql) => {
      const testwort = await localIngredient(sql, coven.id, coven.users.A);
      await insertStock(
        sql,
        coven.id,
        testwort,
        { quantity: 4, unit: 'piece', threshold: 3 },
        coven.users.A,
      );
      const [rosemaryStock] = await stockJars(sql, coven, [
        { name: 'Rosemary', form: 'Herb', quantity: 20, unit: 'g', threshold: 10 },
      ]);
      return { testwort, rosemaryStock };
    });
    const rosemary = await withSql((sql) => compendiumVariant(sql, 'Rosemary', 'Herb'));
    await page.goto(listPath(coven));
    const list = ingredientList(page);
    await expect(cardsIn(list)).toHaveCount(2);
    await markDocument(page);

    // The row's Delete is named for its item, as the members page's Remove
    // is (`Remove <name>`, claude-docs/components/member-list.md); the
    // dialog's title says which delete it is: Delete Ingredient for the
    // coven's own, M5.3's `deleteIngredient`, and Delete Stock for a jar of a
    // compendium entry, M9.4's `deleteStock`. The names are this spec's choice.
    const deleteIngredient = page.getByRole('dialog', { name: 'Delete Ingredient' });
    const deleteStock = page.getByRole('dialog', { name: 'Delete Stock' });

    await test.step('Cancel closes the question and changes nothing', async () => {
      await rowOf(list, 'Testwort').getByRole('button', { name: 'Delete Testwort' }).click();
      await expect(deleteIngredient).toContainText('Testwort');
      await assertNoAccessibilityViolations(page);
      await deleteIngredient.getByRole('button', { name: 'Cancel' }).click();

      await expect(deleteIngredient).toHaveCount(0);
      await expect(rowOf(list, 'Testwort')).toBeVisible();
      const [row] = await withSql(
        (sql) => sql`select deleted_at from ingredients where id = ${testwort.ingredientId}`,
      );
      expect(row.deleted_at).toBeNull();
    });

    await test.step("confirmed, the coven's own ingredient is deleted and its row goes without a reload", async () => {
      await rowOf(list, 'Testwort').getByRole('button', { name: 'Delete Testwort' }).click();
      await expect(deleteIngredient).toContainText('Testwort');
      await deleteIngredient.getByRole('button', { name: 'Delete', exact: true }).click();

      await expect(rowOf(list, 'Testwort')).toHaveCount(0);
      await expect(cardsIn(list)).toHaveCount(1);
      expect(await stillSameDocument(page)).toBe(true);
      // Soft: the row is marked deleted, not removed.
      const [row] = await withSql(
        (sql) => sql`select deleted_at from ingredients where id = ${testwort.ingredientId}`,
      );
      expect(row.deleted_at).not.toBeNull();
    });

    await test.step("confirmed on compendium stock, only the coven's jar goes", async () => {
      await rowOf(list, 'Rosemary').getByRole('button', { name: 'Delete Rosemary' }).click();
      await expect(deleteStock).toContainText('Rosemary');
      await expect(deleteIngredient).toHaveCount(0);
      await deleteStock.getByRole('button', { name: 'Delete', exact: true }).click();

      await expect(rowOf(list, 'Rosemary')).toHaveCount(0);
      expect(await stillSameDocument(page)).toBe(true);
      await withSql(async (sql) => {
        const [jar] = await sql`select deleted_at from inventory_items where id = ${rosemaryStock}`;
        expect(jar.deleted_at).not.toBeNull();
        const [entry] = await sql`
          select deleted_at from ingredients where id = ${rosemary.ingredientId}`;
        expect(entry.deleted_at).toBeNull();
      });
    });
  },
);

test(
  'an empty list prompts the first add, and a filter matching nothing points to clearing it instead',
  { tag: '@story-26' },
  async ({ page }) => {
    const coven = await ownCoven(page, 26);
    const main = page.getByRole('main');
    // The two states are two named status regions, told apart by which is there
    // (claude-docs/components/coven-cards.md, "The empty and no-match states").
    const empty = main.getByRole('status', { name: 'No Ingredients' });
    const noMatch = main.getByRole('status', { name: 'No Matches' });
    // The empty state's own add, in the page rather than the shell's bar.
    const firstAdd = main.getByRole('button', { name: 'Add Ingredient' });

    await test.step('with nothing held, the page offers the first add', async () => {
      const response = await page.goto(listPath(coven));
      expect(response?.status()).toBe(200);
      await expect(empty).toBeVisible();
      await expect(noMatch).toHaveCount(0);
      await expect(cardsIn(ingredientList(page))).toHaveCount(0);
      await expect(empty.getByRole('button', { name: 'Add Ingredient' })).toBeVisible();
      await assertNoAccessibilityViolations(page);

      // The button only acts once the page has hydrated, and the Filters
      // button exists only then (claude-docs/components/facet-panel.md).
      await expect(page.getByRole('button', { name: /^Filters/ })).toBeVisible();
      await firstAdd.click();
      // The shell's own dialog, for this coven.
      await expect(page.getByRole('dialog', { name: 'Add Ingredient' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });

    await withSql((sql) =>
      stockJars(sql, coven, [
        { name: 'Selenite', form: 'Crystal', quantity: 2, unit: 'piece', threshold: 1 },
      ]),
    );

    await test.step('with a search matching nothing, the page says so and offers the Compendium, and no first add', async () => {
      await page.goto(listPath(coven));
      await expect(rowOf(ingredientList(page), 'Selenite')).toBeVisible();
      await expect(empty).toHaveCount(0);
      // Knitbone is Comfrey's folk name; the coven holds no Comfrey.
      await searchCovenList(page, 'Knitbone');
      await expect(noMatch).toBeVisible();
      await expect(empty).toHaveCount(0);
      await expect(firstAdd).toHaveCount(0);
      // It draws no clear of its own: the filter row's clears do that.
      await expect(noMatch.getByRole('button')).toHaveCount(0);
      await expect(noMatch.getByRole('link', { name: 'Search the Compendium' })).toHaveAttribute(
        'href',
        '/compendium?query=Knitbone',
      );
      await assertNoAccessibilityViolations(page);

      await filterOf(page).getByRole('button', { name: 'Clear Name' }).click();
      await expect(rowOf(ingredientList(page), 'Selenite')).toBeVisible();
      await expect(noMatch).toHaveCount(0);
      expect(new URL(page.url()).search).toBe('');
    });
  },
);

test(
  'the source filter and in-stock-only narrow the list, the address keeps both, and local entries stay badged',
  { tag: '@story-27' },
  async ({ page }) => {
    const coven = await ownCoven(page, 27);
    await withSql(async (sql) => {
      const testwort = await localIngredient(sql, coven.id, coven.users.A);
      await insertStock(
        sql,
        coven.id,
        testwort,
        { quantity: 4, unit: 'piece', threshold: 3 },
        coven.users.A,
      );
      const emptywort = await localIngredient(sql, coven.id, coven.users.A, {
        name: 'Fixture Emptywort',
        nomenclature: 'none',
      });
      await insertStock(
        sql,
        coven.id,
        emptywort,
        { quantity: 0, unit: 'piece', threshold: 3 },
        coven.users.A,
      );
      await stockJars(sql, coven, [
        { name: 'Rosemary', form: 'Herb', quantity: 20, unit: 'g', threshold: 10 },
        { name: 'Selenite', form: 'Crystal', quantity: 0, unit: 'piece', threshold: 1 },
      ]);
    });
    await page.goto(listPath(coven));
    const list = ingredientList(page);
    const cards = cardsIn(list);
    await expect(cards).toHaveCount(4);

    // M9.7's three states as a choice chip in the Filters panel, a `group` by
    // role (All, Local and Compendium), and in-stock-only as a switch, as the
    // admin's No Refs is (claude-docs/components/facet-panel.md). A change in
    // the panel is held until Apply Filters. Found whether the panel is open or
    // shut, so what it holds can be read after a reload without opening it.
    const panel = page.getByRole('dialog', { name: 'Filters', includeHidden: true });
    const source = panel.getByRole('group', { name: 'Source', includeHidden: true });
    const inStock = panel.getByRole('switch', { name: /^In Stock/, includeHidden: true });
    const filterBy = async (choose: () => Promise<void>) => {
      await openFilters(page);
      await choose();
      await applyFilters(page, panel);
    };

    await test.step('local only: the two local entries, badged', async () => {
      await filterBy(() => chooseChip(source, /^Local/));
      await expect(cards).toHaveCount(2);
      for (const name of ['Testwort', 'Fixture Emptywort']) {
        await expect(localBadge(rowOf(list, name))).toBeVisible();
      }
      expect(new URL(page.url()).search).not.toBe('');
      await page.reload();
      await expect(cards).toHaveCount(2);
      await expect(chipChoice(source, /^Local/)).toBeChecked();
    });

    await test.step('compendium only: the two jars, unbadged', async () => {
      await filterBy(() => chooseChip(source, /^Compendium/));
      await expect(cards).toHaveCount(2);
      for (const name of ['Rosemary', 'Selenite']) {
        await expect(rowOf(list, name)).toBeVisible();
        await expect(localBadge(rowOf(list, name))).toHaveCount(0);
      }
    });

    await test.step('all again, then in stock only: the empty jars go, and Testwort stays badged', async () => {
      await filterBy(() => chooseChip(source, /^All/));
      await expect(cards).toHaveCount(4);
      await filterBy(() => inStock.check());
      await expect(cards).toHaveCount(2);
      await expect(rowOf(list, 'Rosemary')).toBeVisible();
      await expect(localBadge(rowOf(list, 'Testwort'))).toBeVisible();
      await assertNoAccessibilityViolations(page);
    });

    await test.step('local and in stock together, kept by a reload, and Back steps out of each', async () => {
      await filterBy(() => chooseChip(source, /^Local/));
      await expect(cards).toHaveCount(1);
      await expect(localBadge(rowOf(list, 'Testwort'))).toBeVisible();
      await page.reload();
      await expect(cards).toHaveCount(1);
      await expect(inStock).toBeChecked();
      await expect(chipChoice(source, /^Local/)).toBeChecked();

      await page.goBack();
      await expect(cards).toHaveCount(2);
      await expect(inStock).toBeChecked();
      await expect(chipChoice(source, /^All/)).toBeChecked();
    });
  },
);
