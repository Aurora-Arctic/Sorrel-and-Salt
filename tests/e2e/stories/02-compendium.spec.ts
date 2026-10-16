import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs } from '../session';
import {
  compendiumList,
  compendiumVariant,
  filterOf,
  graphqlFromPage,
  ingredientList,
  insertStock,
  localBadge,
  localIngredient,
  pickCategory,
  rowOf,
  seedCoven,
  stockEditor,
  withSql,
} from './coven-ingredients';

// Stories 14, 15 and 16: the compendium as anyone browses it, an entry added
// from it to a coven, a coven's own ingredient, and the warning that a new
// name resembles one already there. Scaffolds: /compendium (M8.18), its entry
// page (M8.19) and the add modal (M8.16) are not built yet, and the task in
// each annotation turns its `fixme` into `test`.

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

/** The page size every compendium list pages by (M8.10: `first: 25`). */
const PAGE_SIZE = 25;

test.fixme(
  'anyone browses the compendium signed out, narrows it by folk name, category and form, and opens an entry',
  {
    tag: '@story-14',
    annotation: {
      type: 'fixme',
      description: 'M8.18 builds /compendium and M8.19 /compendium/ingredients/[slug]',
    },
  },
  async ({ page }) => {
    // What there is to browse: the seed's compendium, in the cards' own order (M8.14).
    const seeded = await withSql(
      (sql) => sql<{ name: string; canonical_name: string | null }[]>`
        select name, canonical_name from ingredients
        where workspace_id is null and deleted_at is null
        order by lower(name), lower(coalesce(canonical_name, name)), id`,
    );
    expect(seeded.length).toBeGreaterThan(0);

    await test.step('signed out, the first page lists the seed in order', async () => {
      const response = await page.goto('/compendium');
      expect(response?.status()).toBe(200);
      const cards = compendiumList(page).getByRole('listitem');
      const firstPage = seeded.slice(0, PAGE_SIZE);
      await expect(cards).toHaveCount(firstPage.length);
      for (const [index, entry] of firstPage.entries()) {
        await expect(cards.nth(index)).toContainText(entry.name);
        if (entry.canonical_name)
          await expect(cards.nth(index)).toContainText(entry.canonical_name);
      }
      // Signed out there is nothing to add to: each card offers a sign-in link instead (M8.18).
      await expect(cards.first().getByRole('link', { name: /^Sign In/ })).toBeVisible();
      await expect(page.getByRole('button', { name: ADD_TO_MY_INGREDIENTS })).toHaveCount(0);
      await expect(cards.first()).toBeVisible();
      await assertNoAccessibilityViolations(page);
    });

    await test.step('a folk name, its accent left off, finds the two Uncaria', async () => {
      await compendiumSearch(page).fill('una de gato');
      // Enter applies the text to the paged list rather than picking a row (M8.10).
      await compendiumSearch(page).press('Enter');
      const cards = compendiumList(page).getByRole('listitem');
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
      await pickCategory(page, 'Healing');
      const cards = compendiumList(page).getByRole('listitem');
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
      await filterOf(page).getByRole('combobox', { name: 'Form' }).fill('bark');
      await page.getByRole('option', { name: /^Bark/ }).click();
      const cards = compendiumList(page).getByRole('listitem');
      await expect(cards).toHaveCount(2);
      await expect(rowOf(compendiumList(page), "Cat's Claw", 'Uncaria tomentosa')).toBeVisible();
      await expect(rowOf(compendiumList(page), "Cat's Claw", 'Uncaria guianensis')).toBeVisible();
    });

    await test.step("picking Devil's Shoestring opens its entry, with its folk name and categories", async () => {
      const [entry] = await withSql(
        (sql) => sql<{ slug: string }[]>`
          select slug from ingredients
          where workspace_id is null and deleted_at is null and name = 'Devil''s Shoestring'`,
      );
      await page.goto('/compendium');
      await compendiumSearch(page).fill("Devil's Shoestring");
      // Picking a row in the dropdown opens its entry (M8.10).
      await page.getByRole('option', { name: /^Devil's Shoestring/ }).click();

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

test.fixme(
  "a coven's own ingredient stays out of the public list and off the public entry, while its member reads it",
  {
    tag: '@story-14',
    annotation: {
      type: 'fixme',
      description:
        'M8.18 builds /compendium, M8.19 /compendium/ingredients/[slug] and M9.6 /coven/[slug]/ingredients',
    },
  },
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
          await expect(rowOf(compendiumList(reader), 'Mugwort')).toBeVisible();
          await expect(rowOf(compendiumList(reader), 'Fixture Wroot')).toHaveCount(0);
          await expect(compendiumList(reader).getByRole('listitem')).toHaveCount(1);
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

test.fixme(
  "a member adds a compendium entry to the coven with a quantity, and finds it stocked in the coven's list",
  {
    tag: '@story-14',
    annotation: {
      type: 'fixme',
      description:
        'M9.12 wires /compendium’s Add to My Ingredients, on M8.18’s page and M9.6’s list',
    },
  },
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
    // Why the add is the story's: the coven holds no Comfrey yet.
    expect(await heldRows()).toHaveLength(0);

    await test.step('the viewer is offered no add on the compendium', async () => {
      await signInAgainAs(page, coven.users.C);
      await page.goto('/compendium');
      const card = rowOf(compendiumList(page), 'Comfrey');
      await expect(card).toBeVisible();
      await expect(card.getByRole('button', { name: ADD_TO_MY_INGREDIENTS })).toHaveCount(0);
    });

    await test.step('the member adds Comfrey with a quantity and unit, and the confirmation links to the list', async () => {
      await signInAgainAs(page, coven.users.B);
      await page.goto('/compendium');
      // Comfrey has one form, so no form is asked for (M9.12's one-variant shortcut).
      await rowOf(compendiumList(page), 'Comfrey')
        .getByRole('button', { name: ADD_TO_MY_INGREDIENTS })
        .click();
      // The add asks its quantity in a dialog named for the action, with the
      // stock row's Quantity and Unit; the dialog and its Add are this spec's
      // choice, after the admin lists' confirmed actions.
      const dialog = page.getByRole('dialog', { name: ADD_TO_MY_INGREDIENTS });
      await dialog.getByRole('spinbutton', { name: 'Quantity' }).fill('50');
      await dialog.getByRole('combobox', { name: 'Unit' }).selectOption('g');
      await dialog.getByRole('button', { name: 'Add', exact: true }).click();

      const confirmation = page.getByRole('status').getByRole('link');
      await expect(confirmation).toHaveAttribute(
        'href',
        new RegExp(`^/coven/${coven.slug}/ingredients`),
      );
      // The default threshold is the weight one, 10 g, written on the row (M9.3, M9.8).
      expect(await heldRows()).toEqual([{ quantity: 50, unit: 'g', threshold: 10 }]);
      await assertNoAccessibilityViolations(page);
    });

    await test.step("the coven's list holds Comfrey with its stock and default threshold", async () => {
      await page.getByRole('status').getByRole('link').click();
      await expect(page).toHaveURL(new RegExp(`/coven/${coven.slug}/ingredients`));
      const row = rowOf(ingredientList(page), 'Comfrey');
      await expect(row).toBeVisible();
      await expect(localBadge(row)).toHaveCount(0);
      const editor = stockEditor(row, 'Comfrey');
      await editor.open.click();
      await expect(editor.quantity).toHaveValue('50');
      await expect(editor.unit).toHaveValue('g');
      await expect(editor.threshold).toHaveValue('10');
    });

    await test.step('adding it again is handled: still one jar, and no error', async () => {
      await page.goto('/compendium');
      await rowOf(compendiumList(page), 'Comfrey')
        .getByRole('button', { name: ADD_TO_MY_INGREDIENTS })
        .click();
      const dialog = page.getByRole('dialog', { name: ADD_TO_MY_INGREDIENTS });
      await dialog.getByRole('spinbutton', { name: 'Quantity' }).fill('5');
      await dialog.getByRole('combobox', { name: 'Unit' }).selectOption('g');
      await dialog.getByRole('button', { name: 'Add', exact: true }).click();

      await expect(page.getByRole('status').getByRole('link')).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
      expect(await heldRows()).toHaveLength(1);
    });
  },
);

/** The shell's Add Ingredient, which on a coven's page adds to that coven (claude-docs/components/app-shell.md). */
async function openAddIngredient(page: Page) {
  await page.getByRole('button', { name: 'Add Ingredient', disabled: false }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Ingredient' });
  await expect(dialog).toBeVisible();
  return dialog;
}

const INGREDIENT_QUERY = 'query ($id: ID!, $w: ID) { ingredient(id: $id, workspaceId: $w) { id } }';

test.fixme(
  'a member creates an ingredient local to the coven from its add form, which the coven reads and no other coven sees',
  {
    tag: '@story-15',
    annotation: {
      type: 'fixme',
      description:
        'M8.16 opens the Add Ingredient modal from the shell, and M9.6 builds /coven/[slug]/ingredients',
    },
  },
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
      await dialog.getByRole('textbox', { name: 'Name' }).fill(NAME);
      await dialog.getByRole('button', { name: 'Save Ingredient' }).click();

      // Save Ingredient opens what it saved, at /ingredients/[id] (M8.16).
      await expect(page).toHaveURL(/\/ingredients\/[0-9a-f-]{36}$/);
      const tiers = await tiersHolding();
      // Local, and only local: the compendium still lacks it.
      expect(tiers).toEqual([{ id: expect.any(String), workspace_id: coven.id }]);
      createdId = tiers[0].id;
      expect(page.url()).toMatch(new RegExp(`/ingredients/${createdId}$`));
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
      expect((await page.goto(`/ingredients/${createdId}`))?.status()).toBe(404);

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

test.fixme(
  'typing a name like existing entries warns of each by its formal name, a name like none warns of nothing, and the save goes through',
  {
    tag: '@story-16',
    annotation: {
      type: 'fixme',
      description:
        'M8.16 opens the Add Ingredient modal on M9.6’s /coven/[slug]/ingredients, where the warning is asked of the coven',
    },
  },
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
    const hrefs = clawIds.map((row) => `/ingredients/${row.id}`);

    await signInAgainAs(page, coven.users.B);
    await page.goto(`/coven/${coven.slug}/ingredients`);
    const dialog = await openAddIngredient(page);
    const name = dialog.getByRole('textbox', { name: 'Name' });
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

      await expect(page).toHaveURL(/\/ingredients\/[0-9a-f-]{36}$/);
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
