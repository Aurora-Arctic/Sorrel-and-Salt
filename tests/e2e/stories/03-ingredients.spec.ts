import type { Locator, Page } from '@playwright/test';
import type postgres from 'postgres';
import { test, expect } from '../fixtures';
import { signInAgainAs } from '../session';
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
  graphqlFromPage,
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
// and everything a member does from it. Every story here walks it. Each story writes its own coven, so one story's rows
// never decide another's counts.

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
      // A local entry with no jar of it yet is listed too.
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
      // Sorted on (lower(name), identity_key, id).
      const order = ["Cat's Claw", 'Fixture Unstocked', 'Rosemary', 'Selenite', 'Testwort'];
      await expect(cards).toHaveCount(order.length);
      for (const [index, name] of order.entries()) {
        await expect(cards.nth(index)).toContainText(name);
      }
    });

    await test.step('each lists its form in Quick Look, and a shared label shows its formal name on its card', async () => {
      await expect(rowOf(list, "Cat's Claw")).toContainText('Uncaria tomentosa');
      // The forms are Quick Look's, not the card's.
      const forms: [string, string][] = [
        ['Rosemary', 'Herb'],
        ['Selenite', 'Crystal'],
        ['Testwort', 'Root'],
        ["Cat's Claw", 'Bark'],
      ];
      for (const [name, form] of forms) {
        await rowOf(list, name)
          .getByRole('link', { name: new RegExp(`^Quick Look ${name}`) })
          .click();
        const details = page.getByRole('dialog', { name, exact: true });
        await expect(
          details
            .getByRole('list', { name: 'Forms' })
            .getByRole('listitem')
            .filter({ hasText: form }),
        ).toHaveCount(1);
        await details.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(details).toHaveCount(0);
      }
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
      // CovenNav carries the Ingredients row (claude-docs/components/coven-nav.md).
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
      // Each badge is a drawing alone, named in full for a screen reader, and its tip says the state in words,
      // not a colour alone. The tip is an icon tip, hidden from the accessibility tree, so it is found with
      // `includeHidden` in its badge's row, by its words. Axe holds their contrast.
      const tipIn = (row: Locator, words: string) =>
        row.getByRole('tooltip', { includeHidden: true }).filter({ hasText: words });
      await outBadge(rowOf(list, 'Rosemary')).focus();
      await expect(tipIn(rowOf(list, 'Rosemary'), 'Out of Stock')).toHaveText('Out of Stock');
      await page.keyboard.press('Escape');
      await expect(tipIn(rowOf(list, 'Rosemary'), 'Out of Stock')).toHaveCount(0);
      await lowBadge(rowOf(list, 'Sea Salt')).focus();
      await expect(tipIn(rowOf(list, 'Sea Salt'), 'Low Stock')).toHaveText(
        'Low Stock at 10 g or less',
      );
      await page.keyboard.press('Escape');
      await assertNoAccessibilityViolations(page);
    });

    await test.step('the low-stock filter keeps the low rows, in the address', async () => {
      // `lowStockOnly`, a switch as the admin's Without References is
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

    await test.step('the threshold shows on the row, and raising it makes the row low', async () => {
      await page.goto(listPath(coven));
      const row = rowOf(list, 'Selenite');
      const editor = stockEditor(row, 'Selenite');
      await editor.open.click();
      const crystal = editor.jar('Crystal');
      await expect(crystal.threshold).toHaveValue('3');
      await crystal.threshold.fill('5');
      await editor.save.click();

      // The dialog is a child of the card and previews its own Low Stock badge from what is
      // typed, so the badge below only proves the save once the dialog has closed (it closes
      // after the save is answered).
      await expect(editor.dialog).toHaveCount(0);
      await expect(lowBadge(row)).toBeVisible();
      const [stock] = await withSql(
        (sql) => sql<{ threshold: number }[]>`
          select low_stock_threshold::float as threshold from inventory_items where id = ${seleniteId}`,
      );
      expect(stock.threshold).toBe(5);
    });
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

/** A coven's live jars of the entry called `name`, by form, as the database holds them. */
async function jarsOf(coven: Coven, name: string) {
  return withSql(
    (sql) => sql<{ form: string; quantity: number; unit: string; threshold: number }[]>`
      select v.form, s.quantity_on_hand::float as quantity, s.unit,
             s.low_stock_threshold::float as threshold
      from inventory_items s
      join ingredient_variants v on v.id = s.variant_id
      join ingredients i on i.id = v.ingredient_id
      where s.workspace_id = ${coven.id} and i.name = ${name} and s.deleted_at is null
      order by v.form`,
  );
}

test(
  "a member edits an ingredient's stock in one dialog, by mouse or keyboard, adding and removing forms",
  { tag: '@story-24' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Story 24', 'story-24.test', {
      A: 'owner',
      C: 'viewer',
    });
    const { testwortStock } = await withSql(async (sql) => {
      const testwort = await localIngredient(sql, coven.id, coven.users.A);
      const testwortStock = await insertStock(
        sql,
        coven.id,
        testwort,
        { quantity: 4, unit: 'piece', threshold: 3 },
        coven.users.A,
      );
      await stockJars(sql, coven, [
        { name: 'Rosemary', form: 'Herb', quantity: 20, unit: 'g', threshold: 10 },
      ]);
      return { testwortStock };
    });
    const path = listPath(coven);
    await signInAgainAs(page, coven.users.A);
    await page.goto(path);
    const list = ingredientList(page);
    await expect(rowOf(list, 'Rosemary')).toBeVisible();
    await markDocument(page);

    await test.step('the dialog opens on a row for the jar held, and Save waits for a change', async () => {
      const editor = stockEditor(rowOf(list, 'Rosemary'), 'Rosemary');
      await editor.open.click();
      const herb = editor.jar('Herb');
      await expect(herb.quantity).toHaveValue('20');
      await expect(herb.threshold).toHaveValue('10');
      // Why it could save: the dialog holds a jar to change, and nothing is changed yet.
      await expect(editor.save).toBeDisabled();
      await herb.quantity.fill('21');
      await expect(editor.save).toBeEnabled();
      await herb.quantity.fill('20');
      await editor.cancel.click();
      await expect(editor.dialog).toHaveCount(0);
      expect(await jarsOf(coven, 'Rosemary')).toEqual([
        { form: 'Herb', quantity: 20, unit: 'g', threshold: 10 },
      ]);
    });

    await test.step('all three amounts are changed and saved without leaving the page', async () => {
      const editor = stockEditor(rowOf(list, 'Rosemary'), 'Rosemary');
      await editor.open.click();
      const herb = editor.jar('Herb');
      await herb.quantity.fill('0.5');
      // Within the dimension: weight to weight (CLAUDE.md, unit conversion).
      await herb.pickUnit('kg');
      await herb.threshold.fill('0.1');
      await editor.save.click();

      await expect(editor.dialog).toHaveCount(0);
      await expect(editor.open).toBeFocused();
      expect(await jarsOf(coven, 'Rosemary')).toEqual([
        { form: 'Herb', quantity: 0.5, unit: 'kg', threshold: 0.1 },
      ]);
      expect(new URL(page.url()).pathname).toBe(path);
      expect(await stillSameDocument(page)).toBe(true);
      await assertNoAccessibilityViolations(page);
    });

    await test.step('Add Form offers the forms not held, and a form added is saved with the rest', async () => {
      const editor = stockEditor(rowOf(list, 'Rosemary'), 'Rosemary');
      await editor.open.click();
      await editor.addForm.click();
      // The form held is not offered again.
      await expect(page.getByRole('option', { name: 'Herb', exact: true })).toHaveCount(0);
      await page.getByRole('option', { name: 'Oil', exact: true }).click();
      // Picking a form adds nothing yet: Add does, and chooses it, its Quantity focused.
      await expect(editor.jar('Oil').group).toHaveCount(0);
      await editor.addButton.click();
      const oil = editor.jar('Oil');
      await expect(oil.quantity).toBeFocused();
      await oil.quantity.fill('30');
      await oil.pickUnit('ml');
      await oil.threshold.fill('5');
      await editor.save.click();

      await expect(editor.dialog).toHaveCount(0);
      expect(await jarsOf(coven, 'Rosemary')).toEqual([
        { form: 'Herb', quantity: 0.5, unit: 'kg', threshold: 0.1 },
        { form: 'Oil', quantity: 30, unit: 'ml', threshold: 5 },
      ]);
      // With every form held there is nothing left to add. The card reads again once the dialog
      // has closed, and the dialog is drawn from what the card was given.
      // The card's own Oil jar line (the forms are Quick Look's, not the card's).
      await expect(
        rowOf(list, 'Rosemary')
          .getByRole('listitem')
          .filter({ hasText: 'Oil' })
          .filter({ hasText: '30 ml' }),
      ).toBeVisible();
      await editor.open.click();
      await editor.choose('Oil');
      await expect(editor.jar('Oil').quantity).toHaveValue('30');
      await expect(editor.addForm).toHaveCount(0);
      await editor.cancel.click();
    });

    await test.step('Remove is staged until Save, and Undo takes it back', async () => {
      const editor = stockEditor(rowOf(list, 'Rosemary'), 'Rosemary');
      await editor.open.click();
      // The dialog opens on Herb, the first jar.
      await editor.choose('Oil');
      const oil = editor.jar('Oil');
      await oil.remove.click();
      await expect(oil.undo).toBeVisible();
      await oil.undo.click();
      await expect(oil.quantity).toHaveValue('30');
      // Undone, nothing differs from what is held: nothing to save.
      await expect(editor.save).toBeDisabled();
      await oil.remove.click();
      await expect(editor.save).toBeEnabled();
      // Why nothing is lost yet: the jar is still held until Save.
      expect(await jarsOf(coven, 'Rosemary')).toHaveLength(2);
      await editor.save.click();

      await expect(editor.dialog).toHaveCount(0);
      expect(await jarsOf(coven, 'Rosemary')).toEqual([
        { form: 'Herb', quantity: 0.5, unit: 'kg', threshold: 0.1 },
      ]);
      expect(await stillSameDocument(page)).toBe(true);
    });

    await test.step('the keyboard alone opens, edits, saves and cancels', async () => {
      const editor = stockEditor(rowOf(list, 'Testwort'), 'Testwort');
      const root = editor.jar('Root');
      await editor.open.focus();
      await page.keyboard.press('Enter');
      // Opening moves the focus into the first field, Quantity.
      await expect(root.quantity).toBeFocused();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.type('6');
      await page.keyboard.press('Enter');

      await expect(editor.dialog).toHaveCount(0);
      // Closing hands the focus back to what opened it.
      await expect(editor.open).toBeFocused();
      expect(await jarsOf(coven, 'Testwort')).toEqual([
        { form: 'Root', quantity: 6, unit: 'piece', threshold: 3 },
      ]);

      await page.keyboard.press('Enter');
      await expect(root.quantity).toBeFocused();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.type('9');
      // An edit not yet saved is asked about first: the question opens on
      // Keep Editing, and Shift+Tab reaches Discard Changes before it.
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Keep Editing' })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(page.getByRole('button', { name: 'Discard Changes' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(editor.dialog).toHaveCount(0);
      await expect(editor.open).toBeFocused();
      expect(await stockOf(testwortStock)).toEqual({ quantity: 6, unit: 'piece', threshold: 3 });
    });

    await test.step('a save that fails on the network puts nothing on the page and explains', async () => {
      // The network fails the write and nothing else, so the page's own
      // reads still answer: a failure the member could meet on a train.
      await page.route('**/api/graphql', (route) =>
        route.request().postData()?.includes('mutation') ? route.abort('failed') : route.continue(),
      );
      const row = rowOf(list, 'Rosemary');
      const editor = stockEditor(row, 'Rosemary');
      await editor.open.click();
      await editor.jar('Herb').quantity.fill('99');
      await editor.save.click();

      await expect(editor.dialog.getByRole('alert')).toBeVisible();
      await expect(editor.jar('Herb').quantity).toHaveValue('99');
      // The card's own Herb line, not the dialog nested in the same `li`, whose
      // list reads the 99 typed: the line still reading 0.5 kg is the proof no
      // 99 reached the card, where it would read 99 kg in its place.
      await expect(
        row.getByRole('listitem').filter({ hasText: 'Herb' }).filter({ hasText: '0.5 kg' }),
      ).toBeVisible();
      expect((await jarsOf(coven, 'Rosemary'))[0]).toMatchObject({ form: 'Herb', quantity: 0.5 });
      expect(await stillSameDocument(page)).toBe(true);
      await page.unrouteAll();
      await editor.cancel.click();
      await page.getByRole('button', { name: 'Discard Changes' }).click();
    });

    await test.step('Escape on the dialog over Quick Look closes only the dialog, and the Edit Stock button has the focus', async () => {
      await rowOf(list, 'Rosemary')
        .getByRole('link', { name: /^Quick Look Rosemary/ })
        .click();
      const details = page.getByRole('dialog', { name: 'Rosemary', exact: true });
      await expect(details).toBeVisible();
      // The window carries the same Edit Stock button as the card.
      const editor = stockEditor(details, 'Rosemary');
      await editor.open.click();
      await expect(editor.dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(editor.dialog).toHaveCount(0);
      await expect(details).toBeVisible();
      await expect(editor.open).toBeFocused();
      // A browser closes a second dialog on Escape only after a press of the page's own between
      // (Chromium's close watchers), so the window's title is pressed first, as a person would.
      await details.getByRole('heading', { name: 'Rosemary', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(details).toHaveCount(0);
    });

    await test.step('a viewer is offered no Edit Stock button, on the card or in Quick Look', async () => {
      await signInAgainAs(page, coven.users.C);
      await page.goto(path);
      const row = rowOf(list, 'Rosemary');
      await expect(row).toBeVisible();
      await expect(stockEditor(row, 'Rosemary').open).toHaveCount(0);
      await row.getByRole('link', { name: /^Quick Look Rosemary/ }).click();
      const details = page.getByRole('dialog', { name: 'Rosemary', exact: true });
      await expect(details).toBeVisible();
      await expect(stockEditor(details, 'Rosemary').open).toHaveCount(0);
      await assertNoAccessibilityViolations(page);
    });
  },
);

// Its own test, not a step of the one above: that test ran close to the 30 s
// timeout on CI, and this case needs only a held jar and a form not yet held.
test(
  "a member's refused stock save keeps what was typed and says which form it was",
  { tag: '@story-24' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Story 24 Refusal', 'story-24-refusal.test', {
      A: 'owner',
    });
    const rosemaryOil = await withSql(async (sql) => {
      await stockJars(sql, coven, [
        { name: 'Rosemary', form: 'Herb', quantity: 20, unit: 'g', threshold: 10 },
      ]);
      // Rosemary's other form, which the coven does not hold yet.
      return compendiumVariant(sql, 'Rosemary', 'Oil');
    });
    await signInAgainAs(page, coven.users.A);
    await page.goto(listPath(coven));
    const list = ingredientList(page);
    await expect(rowOf(list, 'Rosemary')).toBeVisible();

    const editor = stockEditor(rowOf(list, 'Rosemary'), 'Rosemary');
    await editor.open.click();
    await editor.add('Oil');
    await editor.jar('Oil').quantity.fill('12');
    // Why it is refused: another member stocked Oil while the dialog was open, and a form is
    // held once, so this add finds it held (the batch's own message, on that row).
    await withSql(async (sql) => {
      await insertStock(
        sql,
        coven.id,
        rosemaryOil,
        { quantity: 1, unit: 'ml', threshold: 0 },
        coven.users.A,
      );
    });
    await editor.save.click();

    // The refusal is the form's own, said on its jar, which is chosen to show it.
    await expect(editor.jar('Oil').group).toContainText('already holds this form');
    await expect(editor.dialog).toBeVisible();
    await expect(editor.jar('Oil').quantity).toHaveValue('12');
    // The refusal wrote nothing of the batch.
    expect(await jarsOf(coven, 'Rosemary')).toEqual([
      { form: 'Herb', quantity: 20, unit: 'g', threshold: 10 },
      { form: 'Oil', quantity: 1, unit: 'ml', threshold: 0 },
    ]);
    await editor.cancel.click();
    await page.getByRole('button', { name: 'Discard Changes' }).click();
    await expect(editor.dialog).toHaveCount(0);
  },
);

test(
  "deleting the coven's own ingredient asks first, naming it; Cancel keeps it, Delete removes its card in place and marks it deleted, and a viewer is offered no Delete",
  { tag: '@story-25' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Story 25', 'story-25.test', {
      A: 'owner',
      C: 'viewer',
    });
    const { testwort, keptwort } = await withSql(async (sql) => {
      const testwort = await localIngredient(sql, coven.id, coven.users.A);
      await insertStock(
        sql,
        coven.id,
        testwort,
        { quantity: 4, unit: 'piece', threshold: 3 },
        coven.users.A,
      );
      const keptwort = await localIngredient(sql, coven.id, coven.users.A, {
        name: 'Fixture Keptwort',
        canonicalName: 'Fixtura servata',
      });
      return { testwort, keptwort };
    });
    await signInAgainAs(page, coven.users.A);
    await page.goto(listPath(coven));
    const list = ingredientList(page);
    await expect(cardsIn(list)).toHaveCount(2);
    await markDocument(page);

    // A coven's own entry's card carries a bin, named for the entry
    // ("Delete Ingredient Testwort, Fixtura testalis"), which asks in a dialog
    // named for the delete it is: Delete Ingredient, the `deleteIngredient` mutation.
    const bin = rowOf(list, 'Testwort').getByRole('button', {
      name: 'Delete Ingredient Testwort, Fixtura testalis',
      exact: true,
    });
    const question = page.getByRole('dialog', { name: 'Delete Ingredient', exact: true });
    const deletedAt = async (id: string) => {
      const [row] = await withSql(
        (sql) => sql<{ deleted_at: Date | null }[]>`
          select deleted_at from ingredients where id = ${id}`,
      );
      return row.deleted_at;
    };

    await test.step('the Delete asks first, naming the item, and Cancel changes nothing', async () => {
      await bin.click();
      await expect(question).toContainText('Testwort');
      await assertNoAccessibilityViolations(page);
      await question.getByRole('button', { name: 'Cancel', exact: true }).click();

      await expect(question).toHaveCount(0);
      await expect(bin).toBeFocused();
      await expect(cardsIn(list)).toHaveCount(2);
      expect(await deletedAt(testwort.ingredientId)).toBeNull();
    });

    await test.step('confirmed, the card goes without a reload, the focus goes to the heading, and the removal is announced', async () => {
      await bin.click();
      await question.getByRole('button', { name: 'Delete', exact: true }).click();

      await expect(question).toHaveCount(0);
      await expect(rowOf(list, 'Testwort')).toHaveCount(0);
      await expect(rowOf(list, 'Fixture Keptwort')).toHaveCount(1);
      expect(await stillSameDocument(page)).toBe(true);
      // The bin went with its card, so the focus goes to the page's heading.
      await expect(page.getByRole('heading', { level: 1, name: 'Ingredients' })).toBeFocused();
      // The page's one status region carries the item the delete removed.
      await expect(page.getByRole('status').filter({ hasText: 'Testwort' })).toHaveCount(1);
      // Soft: the row is marked deleted, not removed; the other entry is untouched.
      expect(await deletedAt(testwort.ingredientId)).not.toBeNull();
      expect(await deletedAt(keptwort.ingredientId)).toBeNull();
    });

    await test.step('a viewer is offered no Delete, and one sent by direct id is refused', async () => {
      await signInAgainAs(page, coven.users.C);
      await page.goto(listPath(coven));
      const kept = rowOf(list, 'Fixture Keptwort');
      // Why it could be offered: the viewer reads the card the owner could delete.
      await expect(kept).toBeVisible();
      await expect(kept.getByRole('button', { name: /^Delete/ })).toHaveCount(0);
      await expect(page.getByRole('main').getByRole('button', { name: /^Delete/ })).toHaveCount(0);

      const answer = await graphqlFromPage(
        page,
        'mutation ($w: ID!, $id: ID!) { deleteIngredient(workspaceId: $w, id: $id) }',
        { w: coven.id, id: keptwort.ingredientId },
      );
      expect(answer.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect(await deletedAt(keptwort.ingredientId)).toBeNull();
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

    // The three states are a choice chip in the Filters panel, a `group` by role (All, Local and Compendium),
    // and in-stock-only is a switch (claude-docs/components/facet-panel.md). A change is held until Apply
    // Filters. They are found whether the panel is open or shut, so a reload can read them.
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
