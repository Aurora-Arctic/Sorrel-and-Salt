import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs, signInAs } from '../session';
import {
  cardsIn,
  compendiumList,
  compendiumVariant,
  filterOf,
  graphqlFromPage,
  ingredientList,
  insertStock,
  localBadge,
  localIngredient,
  openFilters,
  rowOf,
  seedCoven,
  stockEditor,
  withSql,
} from './coven-ingredients';
import { openAddIngredient } from './ingredient-dialogs';
import { insertIngredient } from '../../support/db/insert-ingredient';
import {
  insertReference,
  insertReferenceLink,
  insertVariantReferenceLink,
} from '../../support/db/insert-reference';
import { makeIngredient, makeVariant } from '../../support/fixtures/ingredient';
import { slugify } from '@/lib/slugify';

// Stories 14, 15 and 16: the compendium as anyone browses it, an entry added
// from it to a coven, a coven's own ingredient, and the warning that a new
// name resembles one already there. /compendium (M8.18), the add modal (M8.16)
// and the entry pages (M8.19) are built, so 15 and 16 run; the scaffold still
// marked `fixme` waits on the task its annotation names.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** The compendium's search box, a typeahead labelled "Name" as the admin's is (M8.10). */
function compendiumSearch(page: Page) {
  return filterOf(page).getByRole('combobox', { name: 'Name' });
}

/**
 * M8.18's action slot on a card. Matched without regard to case because the
 * entry spells it "Add to my ingredients" and every label is title case,
 * "Add to My Ingredients".
 */
const ADD_TO_MY_INGREDIENTS = /^add to my ingredients/i;

/** The cards page by `CARD_PAGE_SIZE`, 24, so the grid ends on a full row. */
const PAGE_SIZE = 24;

test(
  'anyone browses the compendium signed out, narrows it by folk name, category and form, and opens an entry',
  {
    tag: '@story-14',
  },
  async ({ page }) => {
    // What there is to browse: the seed's compendium, by label. Entries sharing a label tie, and the list breaks the tie by id, so the formal names are checked in the steps below, not by position.
    const seeded = await withSql(
      (sql) => sql<{ name: string; canonical_name: string | null }[]>`
        select name, canonical_name from ingredients
        where workspace_id is null and deleted_at is null
        order by lower(name)`,
    );
    expect(seeded.length).toBeGreaterThan(0);

    await test.step('signed out, the first page lists the seed in order', async () => {
      const response = await page.goto('/compendium');
      expect(response?.status()).toBe(200);
      const cards = compendiumList(page).locator(':scope > li');
      const firstPage = seeded.slice(0, PAGE_SIZE);
      await expect(cards).toHaveCount(firstPage.length);
      for (const [index, entry] of firstPage.entries()) {
        await expect(cards.nth(index)).toContainText(entry.name);
      }
      // Signed out the cards carry no action; signing in is the header's (M8.18).
      await expect(compendiumList(page).getByRole('link', { name: 'Sign In' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: ADD_TO_MY_INGREDIENTS })).toHaveCount(0);
      await expect(cards.first()).toBeVisible();
      await assertNoAccessibilityViolations(page);
    });

    await test.step('a folk name, its accent left off, finds the two Uncaria', async () => {
      await compendiumSearch(page).fill('una de gato');
      // Enter applies the text to the paged list rather than picking a row (M8.10).
      await compendiumSearch(page).press('Enter');
      const cards = compendiumList(page).locator(':scope > li');
      await expect(cards).toHaveCount(2);
      await expect(rowOf(compendiumList(page), "Cat's Claw", 'Uncaria tomentosa')).toBeVisible();
      await expect(rowOf(compendiumList(page), "Cat's Claw", 'Uncaria guianensis')).toBeVisible();
      expect(new URL(page.url()).search).not.toBe('');
    });

    await test.step('a category keeps only the entries filed under it', async () => {
      const healing = await withSql(
        (sql) => sql<{ name: string; canonical_name: string | null }[]>`
          select distinct i.name, i.canonical_name
          from ingredients i
          join ingredient_categories ic on ic.ingredient_id = i.id
          join categories c on c.id = ic.category_id
          where c.name = 'Healing' and c.deleted_at is null
            and i.workspace_id is null and i.deleted_at is null`,
      );
      // Why this narrows anything: Healing holds some of the seed, not all of it.
      expect(healing.length).toBeGreaterThan(0);
      expect(healing.length).toBeLessThan(seeded.length);

      await page.goto('/compendium');
      const panel = await openFilters(page);
      await panel.getByRole('combobox', { name: 'Category' }).fill('Healing');
      await page.getByRole('option', { name: /^Healing/ }).click();
      await panel.getByRole('button', { name: 'Apply Filters' }).click();
      const cards = compendiumList(page).locator(':scope > li');
      await expect(cards).toHaveCount(healing.length);
      for (const entry of healing) {
        await expect(
          rowOf(compendiumList(page), entry.name, entry.canonical_name ?? undefined),
        ).toBeVisible();
      }
      await expect(rowOf(compendiumList(page), 'Mugwort')).toHaveCount(0);
    });

    await test.step('a form keeps only the entries holding it: bark is the two Uncaria', async () => {
      await page.goto('/compendium');
      // M8.13's form filter, a type-ahead labelled "Form" as the admin's is
      // (claude-docs/components/compendium-list.md).
      const panel = await openFilters(page);
      await panel.getByRole('combobox', { name: 'Form' }).fill('bark');
      await page.getByRole('option', { name: /^Bark/ }).click();
      await panel.getByRole('button', { name: 'Apply Filters' }).click();
      const cards = compendiumList(page).locator(':scope > li');
      await expect(cards).toHaveCount(2);
      await expect(rowOf(compendiumList(page), "Cat's Claw", 'Uncaria tomentosa')).toBeVisible();
      await expect(rowOf(compendiumList(page), "Cat's Claw", 'Uncaria guianensis')).toBeVisible();
    });

    await test.step("picking Devil's Shoestring opens its Quick Look, and through it its entry, with its folk name and categories", async () => {
      const [entry] = await withSql(
        (sql) => sql<{ slug: string }[]>`
          select slug from ingredients
          where workspace_id is null and deleted_at is null and name = 'Devil''s Shoestring'`,
      );
      await page.goto('/compendium');
      await compendiumSearch(page).fill("Devil's Shoestring");
      // Picking a row in the dropdown opens its Quick Look over the list (the owner's rule of
      // 2026-10-27), and the Quick Look's link goes on to the entry's page.
      await page.getByRole('option', { name: /^Devil's Shoestring/ }).click();
      const details = page.getByRole('dialog', { name: "Devil's Shoestring", exact: true });
      await expect(details).toBeVisible();
      await expect(page).toHaveURL(/\/compendium\?(.*&)?entry=/);
      await details.getByRole('link', { name: 'See in Compendium' }).click();

      await expect(page).toHaveURL(new RegExp(`/compendium/ingredients/${entry.slug}$`));
      await expect(
        page.getByRole('heading', { level: 1, name: "Devil's Shoestring" }),
      ).toBeVisible();
      // The entry page's lists, named as the form's fieldsets name them
      // (claude-docs/components/ingredient-form.md): Folk Names, Categories.
      await expect(page.getByRole('list', { name: 'Folk Names' }).getByRole('listitem')).toHaveText(
        ['Devil Shoestrings'],
      );
      await expect(page.getByRole('list', { name: 'Categories' }).getByRole('listitem')).toHaveText(
        [/Gambling/, /Protection/],
      );
      await assertNoAccessibilityViolations(page);
    });
  },
);

test(
  "a coven's own ingredient stays out of the public list and off the public entry, while its member reads it",
  { tag: '@story-14' },
  async ({ page, browser, baseURL }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fourteen', 'story-14-local.test', {
      A: 'owner',
      B: 'member',
    });
    // It shares a folk name with the seed's Mugwort, Cronewort, so the same
    // search that finds Mugwort in the compendium would find this too if
    // the coven's tier leaked into it.
    const [local] = await withSql(async (sql) => {
      const held = await localIngredient(sql, coven.id, coven.users.A, {
        name: 'Fixture Wroot',
        nomenclature: 'none',
        folkNames: ['Cronewort'],
      });
      return sql<{ slug: string }[]>`select slug from ingredients where id = ${held.ingredientId}`;
    });

    await test.step('its member reads it in the coven, badged local', async () => {
      // Why the refusals below could pass wrongly: the row is there and reaches its coven.
      await signInAgainAs(page, coven.users.B);
      await page.goto(`/coven/${coven.slug}/ingredients`);
      const row = rowOf(ingredientList(page), 'Fixture Wroot');
      await expect(row).toBeVisible();
      await expect(localBadge(row)).toBeVisible();
    });

    const visitor = await browser.newPage({ baseURL });
    try {
      for (const [who, reader] of [
        ['signed out', visitor],
        ['its own member', page],
      ] as const) {
        await test.step(`${who}: the compendium's search finds Mugwort by the shared folk name, and not it`, async () => {
          await reader.goto('/compendium');
          await compendiumSearch(reader).fill('Cronewort');
          await compendiumSearch(reader).press('Enter');
          await expect(reader).toHaveURL(/Cronewort/);
          await expect(rowOf(compendiumList(reader), 'Mugwort')).toBeVisible();
          await expect(rowOf(compendiumList(reader), 'Fixture Wroot')).toHaveCount(0);
          await expect(cardsIn(compendiumList(reader))).toHaveCount(1);
        });

        await test.step(`${who}: its slug at the public entry route is a 404`, async () => {
          const response = await reader.goto(`/compendium/ingredients/${local.slug}`);
          expect(response?.status()).toBe(404);
        });
      }
    } finally {
      await visitor.close();
    }
  },
);

test(
  "a member adds a compendium entry to the coven, gives it a form and a quantity in Edit Stock from the same card, and finds it stocked in the coven's list",
  { tag: '@story-14' },
  async ({ page }) => {
    const coven = await seedCoven(page, 'Fixture Coven Fourteen Stock', 'story-14-add.test', {
      A: 'owner',
      C: 'viewer',
      B: 'member',
    });
    const comfrey = await withSql((sql) => compendiumVariant(sql, 'Comfrey', 'Leaf'));
    const heldRows = () =>
      withSql(
        (sql) => sql<{ quantity: number; unit: string; threshold: number }[]>`
          select quantity_on_hand::float as quantity, unit, low_stock_threshold::float as threshold
          from inventory_items
          where workspace_id = ${coven.id} and variant_id = ${comfrey.variantId} and deleted_at is null`,
      );
    const cupboardRows = () =>
      withSql(
        (sql) => sql<{ id: string }[]>`
          select e.id from workspace_compendium_entries e
          where e.workspace_id = ${coven.id} and e.ingredient_id = ${comfrey.ingredientId}
            and e.deleted_at is null`,
      );
    const plusOn = (target: typeof page) =>
      rowOf(compendiumList(target), 'Comfrey').getByRole('button', {
        name: ADD_TO_MY_INGREDIENTS,
      });
    // Why the add is the story's: the coven holds no Comfrey yet, in its cupboard or in a jar.
    expect(await cupboardRows()).toHaveLength(0);
    expect(await heldRows()).toHaveLength(0);

    await test.step('the viewer is offered no add on the compendium', async () => {
      await signInAgainAs(page, coven.users.C);
      await page.goto('/compendium');
      const card = rowOf(compendiumList(page), 'Comfrey');
      await expect(card).toBeVisible();
      await expect(card.getByRole('button', { name: ADD_TO_MY_INGREDIENTS })).toHaveCount(0);
    });

    await test.step('the member presses the plus, which adds the entry to the cupboard and no stock', async () => {
      await signInAgainAs(page, coven.users.B);
      await page.goto('/compendium');
      await plusOn(page).click();
      await expect(
        page.getByRole('status').filter({ hasText: 'Added to Fixture Coven Fourteen Stock.' }),
      ).toHaveCount(1);
      expect(await cupboardRows()).toHaveLength(1);
      expect(await heldRows()).toHaveLength(0);
      await assertNoAccessibilityViolations(page);
    });

    await test.step("Edit Stock, from the same card's three dots on the compendium, gives it a form and a quantity", async () => {
      // The page is still the compendium: the card, now held, carries the three dots.
      const card = rowOf(compendiumList(page), 'Comfrey');
      await card.getByRole('button', { name: /^More for Comfrey/ }).click();
      await page.getByRole('menuitem', { name: 'Edit Stock', exact: true }).click();
      const editor = stockEditor(card, 'Comfrey', 'Fixture Coven Fourteen Stock');
      await expect(editor.dialog).toContainText('No stock yet');
      await editor.add('Leaf');
      const leaf = editor.jar('Leaf');
      await leaf.quantity.fill('50');
      await leaf.pickUnit('g');
      await editor.save.click();
      await expect(editor.dialog).toHaveCount(0);
      // The default threshold is the weight one, 10 g, written on the row (M9.3, M9.8).
      expect(await heldRows()).toEqual([{ quantity: 50, unit: 'g', threshold: 10 }]);
      expect(await cupboardRows()).toHaveLength(1);
    });

    await test.step("the coven's list holds Comfrey, not local, with the stock just given", async () => {
      await page.goto(`/coven/${coven.slug}/ingredients`);
      const row = rowOf(ingredientList(page), 'Comfrey');
      await expect(row).toBeVisible();
      await expect(localBadge(row)).toHaveCount(0);
    });

    await test.step('the list shows the stock after a reload', async () => {
      await page.reload();
      const editor = stockEditor(rowOf(ingredientList(page), 'Comfrey'), 'Comfrey');
      await editor.open.click();
      const leaf = editor.jar('Leaf');
      await expect(leaf.quantity).toHaveValue('50');
      await expect(leaf.unit).toHaveText('g');
      await expect(leaf.threshold).toHaveValue('10');
      await editor.cancel.click();
      await assertNoAccessibilityViolations(page);
    });
  },
);

const INGREDIENT_QUERY = 'query ($id: ID!, $w: ID) { ingredient(id: $id, workspaceId: $w) { id } }';

test(
  'a member creates an ingredient local to the coven from its add form, which the coven reads and no other coven sees',
  { tag: '@story-15' },
  async ({ page }) => {
    const elsewhere = await seedCoven(page, 'Fixture Coven Elsewhere', 'story-15-x.test', {
      D: 'owner',
    });
    const coven = await seedCoven(page, 'Fixture Coven Fifteen', 'story-15.test', {
      A: 'owner',
      B: 'member',
      C: 'viewer',
    });
    // D's coven holds something, so their list is drawn and its absence below is a row's.
    await withSql(async (sql) => {
      const selenite = await compendiumVariant(sql, 'Selenite', 'Crystal');
      await insertStock(
        sql,
        elsewhere.id,
        selenite,
        { quantity: 1, unit: 'piece', threshold: 0 },
        elsewhere.users.D,
      );
    });
    const NAME = 'Fixture Zyxbloom';
    const tiersHolding = () =>
      withSql(
        (sql) => sql<{ id: string; workspace_id: string | null }[]>`
          select id, workspace_id from ingredients
          where lower(name) = lower(${NAME}) and deleted_at is null`,
      );
    // Why this is story 15's case: nothing by this name exists in any tier.
    expect(await tiersHolding()).toEqual([]);

    let createdId = '';
    await test.step('a member saves it from the add form with only its name', async () => {
      await signInAgainAs(page, coven.users.B);
      await page.goto(`/coven/${coven.slug}/ingredients`);
      const dialog = await openAddIngredient(page);
      // Name is the one required field (claude-docs/components/ingredient-form.md).
      await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill(NAME);
      await dialog.getByRole('button', { name: 'Save Ingredient' }).click();

      // Save Ingredient opens what it saved, at the coven's entry page,
      // /coven/[slug]/ingredients/[id] (M8.19; the Wave 12 review).
      await expect(page).toHaveURL(new RegExp(`/coven/${coven.slug}/ingredients/[0-9a-f-]{36}$`));
      const tiers = await tiersHolding();
      // Local, and only local: the compendium still lacks it.
      expect(tiers).toEqual([{ id: expect.any(String), workspace_id: coven.id }]);
      createdId = tiers[0].id;
      expect(page.url()).toMatch(new RegExp(`/coven/${coven.slug}/ingredients/${createdId}$`));
    });

    for (const [who, userId] of [
      ['the member who made it', coven.users.B],
      ['the owner', coven.users.A],
      ['the viewer', coven.users.C],
    ] as const) {
      await test.step(`${who} reads it in the coven's list, badged local`, async () => {
        await signInAgainAs(page, userId);
        await page.goto(`/coven/${coven.slug}/ingredients`);
        const row = rowOf(ingredientList(page), NAME);
        await expect(row).toBeVisible();
        await expect(localBadge(row)).toBeVisible();
      });
    }

    await test.step('the viewer has no add control, and a write sent straight is refused', async () => {
      // Signed in as C from the step before, on the coven's list.
      await expect(rowOf(ingredientList(page), NAME)).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Add Ingredient', disabled: false }),
      ).toHaveCount(0);
      const answer = await graphqlFromPage(
        page,
        'mutation ($w: ID!) { createWorkspaceIngredient(workspaceId: $w, input: { name: "Fixture Viewerwort", variants: [] }) { id } }',
        { w: coven.id },
      );
      expect(answer.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      const viewerwort = await withSql(
        (sql) => sql`select id from ingredients where name = 'Fixture Viewerwort'`,
      );
      expect(viewerwort).toHaveLength(0);
    });

    await test.step("another coven's member sees it nowhere, by list or by id", async () => {
      await signInAgainAs(page, elsewhere.users.D);
      await page.goto(`/coven/${elsewhere.slug}/ingredients`);
      await expect(rowOf(ingredientList(page), 'Selenite')).toBeVisible();
      await expect(rowOf(ingredientList(page), NAME)).toHaveCount(0);

      expect((await page.goto(`/coven/${coven.slug}/ingredients`))?.status()).toBe(404);
      // The entry's page is the coven's too, so a non-member meets the same 404 (M8.19).
      expect((await page.goto(`/coven/${coven.slug}/ingredients/${createdId}`))?.status()).toBe(
        404,
      );

      // By direct id, under either coven's name: refused under the one D is
      // not in, and not found in the one D is.
      await page.goto(`/coven/${elsewhere.slug}/ingredients`);
      const underTheirs = await graphqlFromPage(page, INGREDIENT_QUERY, {
        id: createdId,
        w: coven.id,
      });
      expect(underTheirs.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      const underOwn = await graphqlFromPage(page, INGREDIENT_QUERY, {
        id: createdId,
        w: elsewhere.id,
      });
      expect(underOwn.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
    });
  },
);

/** The five Cat's Claws the seed holds, one label over five formal names. */
const CATS_CLAWS = [
  'Dolichandra unguis-cati',
  'Felis catus',
  'Senegalia greggii',
  'Uncaria guianensis',
  'Uncaria tomentosa',
];

test(
  'typing a name like existing entries warns of each by its formal name, a name like none warns of nothing, and the save goes through',
  { tag: '@story-16' },
  async ({ page, context }) => {
    const coven = await seedCoven(page, 'Fixture Coven Sixteen', 'story-16.test', {
      A: 'owner',
      B: 'member',
    });
    const clawIds = await withSql(
      (sql) => sql<{ id: string; canonical_name: string }[]>`
        select id, canonical_name from ingredients
        where workspace_id is null and deleted_at is null and name = 'Cat''s Claw'`,
    );
    expect(clawIds.map((row) => row.canonical_name).sort()).toEqual(CATS_CLAWS);
    // Each match links the coven's entry page, which reaches a compendium
    // entry too (claude-docs/components/ingredient-form.md, the duplicate warning).
    const hrefs = clawIds.map((row) => `/coven/${coven.slug}/ingredients/${row.id}`);

    await signInAgainAs(page, coven.users.B);
    await page.goto(`/coven/${coven.slug}/ingredients`);
    const dialog = await openAddIngredient(page);
    const name = dialog.getByRole('textbox', { name: 'Name', exact: true });
    const warning = dialog.getByRole('status', { name: 'Possible duplicates' });
    const matches = warning.getByRole('link');

    await test.step('Cats Claw names the near matches, each by its formal name, and opens the one it links', async () => {
      await name.fill('Cats Claw');
      // Five plants and a cat share the label; the warning names the closest
      // three (DUPLICATE_ROWS, src/components/IngredientForm/duplicates.tsx),
      // and only the formal name tells them apart.
      await expect(matches).toHaveCount(3);
      const shown = await matches.allTextContents();
      const formal = shown.map((text) => CATS_CLAWS.find((canonical) => text.includes(canonical)));
      expect(formal).not.toContain(undefined);
      expect(new Set(formal).size).toBe(3);
      for (const link of await matches.all()) {
        expect(hrefs).toContain(await link.getAttribute('href'));
      }
      await assertNoAccessibilityViolations(page);

      // Each opens in a new tab, so the form keeps its place (MB.115).
      const [opened] = await Promise.all([context.waitForEvent('page'), matches.first().click()]);
      await opened.waitForLoadState();
      expect(new URL(opened.url()).pathname).toBe(await matches.first().getAttribute('href'));
      await expect(opened.getByRole('heading', { level: 1, name: "Cat's Claw" })).toBeVisible();
      await opened.close();
      await expect(name).toHaveValue('Cats Claw');
    });

    await test.step('a name like nothing warns of nothing', async () => {
      await name.fill('Fixture Nothingalike');
      await expect(matches).toHaveCount(0);
    });

    await test.step('a near match is not blocked: held once, then saved with Create Anyway', async () => {
      await name.fill("Cat's Claw");
      await dialog.getByRole('textbox', { name: 'Formal Name' }).fill('Fixtura felina');
      await expect(matches).toHaveCount(3);

      await dialog.getByRole('button', { name: 'Save Ingredient' }).click();
      // The first save is held on the warning: the name is marked and the
      // focus goes to the way past it.
      await expect(name).toHaveAttribute('aria-invalid', 'true');
      await expect(dialog.getByRole('button', { name: 'Create Anyway' })).toBeFocused();
      const held = await withSql(
        (sql) => sql`select id from ingredients where workspace_id = ${coven.id}`,
      );
      expect(held).toHaveLength(0);

      await dialog.getByRole('button', { name: 'Create Anyway' }).click();
      await dialog.getByRole('button', { name: 'Save Ingredient' }).click();

      await expect(page).toHaveURL(new RegExp(`/coven/${coven.slug}/ingredients/[0-9a-f-]{36}$`));
      const created = await withSql(
        (sql) => sql<{ id: string; name: string; canonical_name: string }[]>`
          select id, name, canonical_name from ingredients where workspace_id = ${coven.id}`,
      );
      expect(created).toEqual([
        { id: expect.any(String), name: "Cat's Claw", canonical_name: 'Fixtura felina' },
      ]);
    });
  },
);

test(
  'a reader sees where an entry’s information came from, and an entry with no sources says so',
  { tag: '@story-64' },
  async ({ page, browser, baseURL }) => {
    // The rows are written by a user made on a page of its own; the reader is
    // the signed-out `page`.
    const maker = await browser.newPage({ baseURL });
    const author = await (async () => {
      try {
        return (await signInAs(maker, 'author@story-64.test', ['discord'], 'admin')).userId;
      } finally {
        await maker.close();
      }
    })();
    const cited = 'Fixture Bramble Sourced';
    const bare = 'Fixture Bramble Unsourced';
    const form = 'Fixture Oil';
    await withSql(async (sql) => {
      const id = await insertIngredient(
        sql,
        makeIngredient({
          name: cited,
          nomenclature: 'none',
          variants: [makeVariant({ form })],
        }),
        author,
      );
      const [variant] = await sql<{ id: string }[]>`
        select id from ingredient_variants where ingredient_id = ${id}`;
      // Written out of order, so the page's order is the loader's and not insertion.
      const zeta = await insertReference(sql, { title: 'Zeta Fixtures' }, author);
      const alpha = await insertReference(
        sql,
        {
          kind: 'web_page',
          title: 'Alpha Fixtures',
          container: 'Fixture Site',
          url: 'https://fixtures.example/alpha',
          accessed: '2026-01-01',
        },
        author,
      );
      const oil = await insertReference(sql, { title: 'Oil Fixtures' }, author);
      await insertReferenceLink(sql, id, zeta, author);
      await insertReferenceLink(sql, id, alpha, author, 'p. 112');
      await insertVariantReferenceLink(sql, variant!.id, oil, author);
      await insertIngredient(
        sql,
        makeIngredient({ name: bare, nomenclature: 'none', variants: [] }),
        author,
      );
    });

    await test.step('a section’s note number leads to its note, the note to its entry, and each links back', async () => {
      await page.goto(`/compendium/ingredients/${slugify(cited)}`);
      const details = page.getByRole('region', { name: 'Details' });
      const notes = page.getByRole('list', { name: 'Notes' });
      const bibliography = page.getByRole('list', { name: 'Bibliography' });

      // The loader's order, not insertion order: Alpha before Zeta.
      await expect(details.getByRole('link', { name: /^Note \d+$/ })).toHaveCount(2);
      await details.getByRole('link', { name: 'Note 1' }).click();
      await expect(page).toHaveURL(/#note-1$/);
      const note = notes.getByRole('listitem').nth(0);
      await expect(note).toContainText('Alpha Fixtures');
      await expect(note).toContainText('p. 112');

      await note.getByRole('link', { name: /Alpha/ }).click();
      await expect(page).toHaveURL(/#ref-/);
      const entry = bibliography.getByRole('listitem').filter({ hasText: 'Alpha Fixtures' });
      await expect(entry).toBeVisible();

      await entry.getByRole('link', { name: 'Back to Note 1' }).click();
      await expect(page).toHaveURL(/#note-1$/);
      await note.getByRole('link', { name: 'Back to Details' }).click();
      await expect(page).toHaveURL(/#note-ref-1$/);
      await expect(details.getByRole('link', { name: 'Note 1' })).toBeInViewport();
    });

    await test.step('a form’s own source is noted at the end of its section, and the bibliography holds each once, alphabetically', async () => {
      const section = page.locator(`#form-${slugify(form)}`);
      await expect(section.getByRole('list', { name: /References/ })).toHaveCount(0);
      await section.getByRole('link', { name: 'Note 3' }).click();
      await expect(page).toHaveURL(/#note-3$/);
      await expect(
        page.getByRole('list', { name: 'Notes' }).getByRole('link', { name: 'Back to ' + form }),
      ).toBeVisible();

      const entries = page.getByRole('list', { name: 'Bibliography' }).getByRole('listitem');
      await expect(entries).toHaveCount(3);
      await expect(entries.nth(0)).toContainText('Alpha Fixtures');
      await expect(entries.nth(1).locator('cite')).toHaveText('Oil Fixtures');
      await expect(entries.nth(2).locator('cite')).toHaveText('Zeta Fixtures');
      // A web page’s title is quoted, not italic; its url is a link out.
      const link = entries.nth(0).getByRole('link', { name: /source/i });
      await expect(link).toHaveAttribute('href', 'https://fixtures.example/alpha');
      await expect(link).toHaveAttribute('rel', /noopener/);
      await expect(entries.nth(2).getByRole('link', { name: /source/i })).toHaveCount(0);
      await assertNoAccessibilityViolations(page);
    });

    await test.step('an entry with none shows an empty state rather than nothing', async () => {
      await page.goto(`/compendium/ingredients/${slugify(bare)}`);
      const section = page.getByRole('region', { name: 'References' });

      await expect(section).toBeVisible();
      await expect(section.getByRole('list')).toHaveCount(0);
      await expect(section.locator('p')).toBeVisible();
      await assertNoAccessibilityViolations(page);
    });
  },
);
