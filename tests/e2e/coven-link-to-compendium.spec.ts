import type { Browser, Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import {
  compendiumVariant,
  insertSpell,
  insertStock,
  localIngredient,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';
import { editIngredientDialog } from './stories/ingredient-dialogs';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';

// Link to the Compendium for a coven's own entry (M8.17): a dialog of its own,
// opened from the entry page's Edit menu at `?link`, which picks one
// compendium entry or several from a search and maps each of the entry's
// forms to a pick, then splits the own entry into them, its jars and spell
// layers moving form by form. Unlike the page's Similar block
// (similar-in-the-compendium.spec.ts), it is offered on an entry with a formal
// name, and reaches entries of other names. No story walks it, so this gate
// spec proves it, and the focus an Edit menu's dialog gives back.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** Compendium entries, each a name and its forms, written by an admin of `domain`; their ids in order. */
async function compendiumEntries(
  browser: Browser,
  baseURL: string | undefined,
  domain: string,
  entries: { name: string; forms: string[] }[],
): Promise<string[]> {
  const admin = await browser.newPage({ baseURL });
  try {
    const { userId } = await signInAs(admin, `admin@${domain}`, ['discord'], 'admin');
    return await withSql(async (sql) => {
      const ids: string[] = [];
      for (const { name, forms } of entries) {
        ids.push(
          await insertIngredient(
            sql,
            makeIngredient({
              name,
              nomenclature: 'none',
              variants: forms.map((form) => makeVariant({ form })),
            }),
            userId,
          ),
        );
      }
      return ids;
    });
  } finally {
    await admin.close();
  }
}

/**
 * The coven's own Testwort, with a formal name, in `forms`: a jar of the
 * `jar` form and a spell laying the `layer` form, all by the owner A. B, a
 * member, is signed in.
 */
async function heldTestwort(
  page: Page,
  domain: string,
  forms: string[],
  { jar, layer }: { jar: string; layer: string },
) {
  const coven = await seedCoven(page, `Fixture Coven ${domain}`, domain, {
    A: 'owner',
    B: 'member',
  });
  const author = coven.users.A;
  const held = await withSql(async (sql) => {
    const own = await localIngredient(sql, coven.id, author, {
      name: 'Testwort',
      canonicalName: 'Fixtura testalis',
      nomenclature: 'botanical',
      variants: forms.map((form) => makeVariant({ form })),
    });
    const variantOf = async (form: string) => {
      const [variant] = await sql<{ id: string }[]>`
        select id from ingredient_variants
        where ingredient_id = ${own.ingredientId} and form = ${form}`;
      return { ingredientId: own.ingredientId, variantId: variant.id };
    };
    const jarId = await insertStock(
      sql,
      coven.id,
      await variantOf(jar),
      { quantity: 20, unit: 'g', threshold: 5 },
      author,
    );
    const spellId = await insertSpell(sql, coven.id, 'Fixture Working', 'workspace', author);
    const laid = await variantOf(layer);
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${author}, true)`;
      await tx`
        insert into spell_ingredients (
          spell_id, ingredient_id, variant_id, layer_order, created_by, updated_by
        )
        values (${spellId}, ${own.ingredientId}, ${laid.variantId}, 1, ${author}, ${author})`;
    });
    return { ingredientId: own.ingredientId, jarId, spellId };
  });
  await signInAgainAs(page, coven.users.B);
  return { coven, held };
}

/** Which entry the jar and the spell layer are of now, and whether the own entry is gone. */
async function whereHeld(held: { ingredientId: string; jarId: string; spellId: string }) {
  return withSql(async (sql) => {
    const [jar] = await sql<{ ingredient_id: string }[]>`
      select ingredient_id from inventory_items where id = ${held.jarId} and deleted_at is null`;
    const [layer] = await sql<{ ingredient_id: string }[]>`
      select ingredient_id from spell_ingredients
      where spell_id = ${held.spellId} and deleted_at is null`;
    const [own] = await sql<{ gone: boolean }[]>`
      select deleted_at is not null as gone from ingredients where id = ${held.ingredientId}`;
    return { jar: jar.ingredient_id, layer: layer.ingredient_id, ownGone: own.gone };
  });
}

/** The entry page's Edit menu button. */
const editMenu = (page: Page): Locator =>
  page.getByRole('main').getByRole('button', { name: 'Edit', exact: true });

/** Chooses `item` from the entry page's Edit menu. */
async function chooseFromEdit(page: Page, item: string): Promise<void> {
  await editMenu(page).click();
  await page.getByRole('menu', { name: 'Edit' }).getByRole('menuitem', { name: item }).click();
}

/** Opens the Link dialog from the entry page's Edit menu. */
async function openLink(page: Page, url: string): Promise<Locator> {
  await page.goto(url);
  await chooseFromEdit(page, 'Link to the Compendium');
  const dialog = page.getByRole('dialog', { name: /Link to the Compendium/ });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(`${url}?link`);
  return dialog;
}

/** Picks `target` in the Link dialog's search. */
async function pick(page: Page, dialog: Locator, target: string): Promise<void> {
  const box = dialog.getByRole('combobox', { name: 'Compendium Entry' });
  await box.click();
  await box.fill(target);
  const option = page.getByRole('listbox').getByRole('option', { name: new RegExp(`^${target}`) });
  await option.click();
  await expect(
    dialog
      .getByRole('list', { name: 'Picked Entries' })
      .getByRole('button', { name: `Remove ${target}` }),
  ).toBeVisible();
}

/** The cell saying where `form` goes, in the dialog's form map. */
const goesTo = (dialog: Locator, form: string): Locator =>
  dialog
    .getByRole('table', { name: 'Where Each Form Goes' })
    .getByRole('row', { name: new RegExp(`^${form}`) })
    .getByRole('cell')
    .nth(1);

test('Edit Ingredient, opened from the Edit menu and cancelled, gives the menu its focus back', async ({
  page,
}) => {
  const { coven, held } = await heldTestwort(page, 'coven-link-focus.test', ['Root'], {
    jar: 'Root',
    layer: 'Root',
  });
  await page.goto(`/coven/${coven.slug}/ingredients/${held.ingredientId}`);

  await chooseFromEdit(page, 'Edit Ingredient');
  const dialog = editIngredientDialog(page, 'Testwort', 'Fixtura testalis');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await expect(dialog).toBeHidden();
  await expect(editMenu(page)).toBeFocused();
});

test('a member links an own entry with a formal name to a compendium entry of another name, on a phone, jar and spell layer moving', async ({
  page,
  browser,
  baseURL,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const domain = 'coven-link.test';
  const [compendiumId] = await compendiumEntries(browser, baseURL, domain, [
    { name: 'Fixture Linkroot', forms: ['Root'] },
  ]);
  const { coven, held } = await heldTestwort(page, domain, ['Root'], {
    jar: 'Root',
    layer: 'Root',
  });
  // Before the link, the jar and the layer are the own entry's.
  expect(await whereHeld(held)).toEqual({
    jar: held.ingredientId,
    layer: held.ingredientId,
    ownGone: false,
  });

  const dialog = await openLink(page, `/coven/${coven.slug}/ingredients/${held.ingredientId}`);
  await pick(page, dialog, 'Fixture Linkroot');
  await expect(goesTo(dialog, 'Root')).toHaveText('Fixture Linkroot');
  await assertNoAccessibilityViolations(page);
  await dialog.getByRole('button', { name: 'Link', exact: true }).click();

  await expect(page).toHaveURL(`/coven/${coven.slug}/ingredients/${compendiumId}`);
  expect(await whereHeld(held)).toEqual({
    jar: compendiumId,
    layer: compendiumId,
    ownGone: true,
  });
});

test('a member splits an own entry into two compendium entries, choosing where a form both have goes', async ({
  page,
  browser,
  baseURL,
}) => {
  const domain = 'coven-link-split.test';
  // Both picks have a Leaf; only the first has a Root.
  const [rootId, leafId] = await compendiumEntries(browser, baseURL, domain, [
    { name: 'Fixture Splitroot', forms: ['Root', 'Leaf'] },
    { name: 'Fixture Splitleaf', forms: ['Leaf'] },
  ]);
  const { coven, held } = await heldTestwort(page, domain, ['Root', 'Leaf'], {
    jar: 'Root',
    layer: 'Leaf',
  });

  const dialog = await openLink(page, `/coven/${coven.slug}/ingredients/${held.ingredientId}`);
  await pick(page, dialog, 'Fixture Splitroot');
  await pick(page, dialog, 'Fixture Splitleaf');
  await expect(goesTo(dialog, 'Root')).toHaveText('Fixture Splitroot');
  const link = dialog.getByRole('button', { name: 'Link', exact: true });
  // The Leaf holds the layer and has two homes, so Link waits for a choice.
  await expect(link).toBeDisabled();
  await dialog.getByRole('combobox', { name: 'Leaf Goes To' }).selectOption('Fixture Splitleaf');
  await link.click();

  // A success goes to the first pick in the coven.
  await expect(page).toHaveURL(`/coven/${coven.slug}/ingredients/${rootId}`);
  expect(await whereHeld(held)).toEqual({ jar: rootId, layer: leafId, ownGone: true });
});

test('a refused link shows in the dialog and moves nothing', async ({ page, browser, baseURL }) => {
  const domain = 'coven-link-refused.test';
  await compendiumEntries(browser, baseURL, domain, [
    { name: 'Fixture Refusedroot', forms: ['Root'] },
  ]);
  const { coven, held } = await heldTestwort(page, domain, ['Root'], {
    jar: 'Root',
    layer: 'Root',
  });
  // The coven already holds a jar of the compendium entry's Root, which the own jar would meet.
  await withSql(async (sql) =>
    insertStock(
      sql,
      coven.id,
      await compendiumVariant(sql, 'Fixture Refusedroot', 'Root'),
      { quantity: 5, unit: 'g', threshold: 1 },
      coven.users.A,
    ),
  );
  const url = `/coven/${coven.slug}/ingredients/${held.ingredientId}`;

  const dialog = await openLink(page, url);
  await pick(page, dialog, 'Fixture Refusedroot');
  await dialog.getByRole('button', { name: 'Link', exact: true }).click();

  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(`${url}?link`);
  expect(await whereHeld(held)).toEqual({
    jar: held.ingredientId,
    layer: held.ingredientId,
    ownGone: false,
  });
});
