import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';
import { curatedFormId } from '../support/db/curated-ids';
import {
  insertReference,
  insertReferenceLink,
  insertVariantReferenceLink,
} from '../support/db/insert-reference';
import { insertIngredient } from '../support/db/insert-ingredient';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { ingredientSlug } from '@/lib/slugify';
import {
  ingredientList,
  localIngredient,
  rowOf,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';
import { editIngredientControl, editIngredientDialog } from './stories/ingredient-dialogs';

// Reclassifying a named entry as None in its edit form, in a browser: Save opens, and the save sticks, for a
// compendium entry as a site admin and for a coven's own entry as its owner.
// Regression: choosing None left Save disabled, so the change could not be saved.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** The row's classification and formal name as stored. */
async function storedIdentity(id: string) {
  const [row] = await withSql(
    (sql) => sql<{ nomenclature: string; canonical_name: string | null }[]>`
      select nomenclature::text, canonical_name from ingredients where id = ${id}`,
  );
  return row;
}

/** Chooses None as the dialog's classification, the formal name it had emptied and shut. */
async function chooseNone(page: Page, dialog: Locator) {
  await dialog.getByRole('button', { name: 'Open All' }).click();
  const formal = dialog.getByRole('textbox', { name: 'Formal Name' });
  await expect(formal).not.toHaveValue('');
  await dialog.getByRole('combobox', { name: 'Classification' }).click();
  await page
    .getByRole('listbox', { name: 'Classification choices' })
    .getByRole('option', { name: 'None', exact: true })
    .click();
  await expect(formal).toHaveValue('');
  await expect(formal).toBeDisabled();
}

test('a compendium entry reclassified as None saves, as a site admin', async ({ page }) => {
  const { userId } = await signInAs(
    page,
    'none-admin@classification-none.test',
    ['discord'],
    'admin',
  );
  const fixture = makeIngredient({
    name: 'Fixture Nonewort',
    canonicalName: 'Fixtura nullaria',
    nomenclature: 'botanical',
    variants: [],
  });
  const id = await withSql((sql) => insertIngredient(sql, fixture, userId));

  await page.goto(
    `/curator/compendium?edit=${ingredientSlug(fixture.name, fixture.canonicalName)}`,
  );
  const dialog = editIngredientDialog(page, fixture.name, fixture.canonicalName!);
  await expect(dialog).toBeVisible();
  const save = dialog.getByRole('button', { name: 'Save Ingredient', exact: true });
  // The precondition: nothing changed yet, so Save is shut until something is.
  await expect(save).toBeDisabled();

  await chooseNone(page, dialog);

  await expect(save).toBeEnabled();
  await save.click();
  await expect
    .poll(() => storedIdentity(id))
    .toEqual({ nomenclature: 'none', canonical_name: null });
});

test("a coven's own entry reclassified as None saves, as its owner", async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Coven None', 'coven-none.test', { A: 'owner' });
  const { ingredientId } = await withSql((sql) =>
    localIngredient(sql, coven.id, coven.users.A, {
      name: 'Fixture Covenwort',
      canonicalName: 'Fixtura conventa',
      nomenclature: 'botanical',
    }),
  );
  await signInAgainAs(page, coven.users.A);
  await page.goto(`/coven/${coven.slug}/ingredients`);

  await editIngredientControl(
    rowOf(ingredientList(page), 'Fixture Covenwort'),
    'Fixture Covenwort',
    'Fixtura conventa',
  ).click();
  const dialog = editIngredientDialog(page, 'Fixture Covenwort', 'Fixtura conventa');
  await expect(dialog).toBeVisible();
  const save = dialog.getByRole('button', { name: 'Save Ingredient', exact: true });
  await expect(save).toBeDisabled();

  await chooseNone(page, dialog);

  await expect(save).toBeEnabled();
  await save.click();
  await expect
    .poll(() => storedIdentity(ingredientId))
    .toEqual({ nomenclature: 'none', canonical_name: null });
});

/**
 * A compendium entry shaped as the seeded Beeswax: Unknown with no formal name, hidden, in no category,
 * one form picked from the curated Wax, a source for its classification and description, and one for
 * the form. Returns its id.
 */
async function unknownWaxEntry(name: string, author: string) {
  return withSql(async (sql) => {
    const formId = await curatedFormId(sql, 'Wax');
    const fixture = makeIngredient({
      name,
      nomenclature: 'unknown',
      canonicalName: null,
      description: 'A fixture wax.',
      categories: [],
      variants: [makeVariant({ form: 'Wax', formId })],
    });
    const id = await insertIngredient(sql, fixture, author);
    await sql`update ingredients set shown = false where id = ${id}`;
    const [variant] = await sql<{ id: string }[]>`
      select id from ingredient_variants where ingredient_id = ${id} and deleted_at is null`;
    const source = await insertReference(sql, { title: 'Fixture Almanac of Waxes' }, author);
    await insertReferenceLink(sql, id, source, author, null, {
      supports: ['nomenclature', 'description'],
    });
    await insertVariantReferenceLink(sql, variant.id, source, author, null, { supports: ['form'] });
    return id;
  });
}

/** In an open edit dialog of an entry with no formal name: Save shut, then None chosen, then Save pressed. */
async function saveAsNone(page: Page, dialog: Locator) {
  await expect(dialog).toBeVisible();
  const save = dialog.getByRole('button', { name: 'Save Ingredient', exact: true });
  await expect(save).toBeDisabled();
  await dialog.getByRole('button', { name: 'Open All' }).click();
  const formal = dialog.getByRole('textbox', { name: 'Formal Name' });
  await expect(formal).toHaveValue('');
  await dialog.getByRole('combobox', { name: 'Classification' }).click();
  await page
    .getByRole('listbox', { name: 'Classification choices' })
    .getByRole('option', { name: 'None', exact: true })
    .click();
  await expect(formal).toBeDisabled();
  await expect(save).toBeEnabled();
  await save.click();
}

// Regression: an entry shaped as the seeded Beeswax, Unknown with no formal name, a picked form and a
// source for its classification, kept Save off after None was chosen.
test('an Unknown compendium entry with a picked form reclassified as None saves from the admin list, as a site admin', async ({
  page,
}) => {
  const { userId } = await signInAs(
    page,
    'unknown-admin@classification-none.test',
    ['discord'],
    'admin',
  );
  const id = await unknownWaxEntry('Fixture Waxwort', userId);

  await page.goto(`/curator/compendium?edit=${ingredientSlug('Fixture Waxwort', null)}`);
  await saveAsNone(page, editIngredientDialog(page, 'Fixture Waxwort'));

  await expect
    .poll(() => storedIdentity(id))
    .toEqual({ nomenclature: 'none', canonical_name: null });
});

// Regression: opened from the pencil on its public entry page, the same shape of entry kept Save off.
test("an Unknown compendium entry with a picked form reclassified as None saves from its entry page's pencil, as a site admin", async ({
  page,
}) => {
  const { userId } = await signInAs(
    page,
    'pencil-admin@classification-none.test',
    ['discord'],
    'admin',
  );
  const id = await unknownWaxEntry('Fixture Pencilwax', userId);

  await page.goto(`/compendium/ingredients/${ingredientSlug('Fixture Pencilwax', null)}`);
  await page
    .getByRole('link', { name: 'Edit in Compendium Fixture Pencilwax', exact: true })
    .click();
  await saveAsNone(page, page.getByRole('dialog', { name: /Edit Compendium Entry/ }));

  await expect
    .poll(() => storedIdentity(id))
    .toEqual({ nomenclature: 'none', canonical_name: null });
});
