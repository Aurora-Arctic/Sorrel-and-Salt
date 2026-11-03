import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { makeIngredient } from '../support/fixtures/ingredient';
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

  await page.goto(`/admin/compendium?edit=${ingredientSlug(fixture.name, fixture.canonicalName)}`);
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

// Regression: the seeded Beeswax, Unknown with no formal name, a picked form and a source for its
// classification, kept Save off after None was chosen.
test('a seeded Unknown compendium entry reclassified as None saves, as a site admin', async ({
  page,
}) => {
  await signInAs(page, 'unknown-admin@classification-none.test', ['discord'], 'admin');
  const [seeded] = await withSql(
    (sql) => sql<{ id: string; picked: number; cited: number }[]>`
      select i.id,
        (select count(*)::int from ingredient_variants v
          where v.ingredient_id = i.id and v.deleted_at is null and v.form_id is not null) as picked,
        (select count(*)::int from reference_links r
          where r.ingredient_id = i.id and r.deleted_at is null) as cited
      from ingredients i
      where i.name = 'Beeswax' and i.workspace_id is null and i.deleted_at is null
        and i.nomenclature = 'unknown' and i.canonical_name is null`,
  );
  // The precondition: the seed's own shape, Unknown and nameless, with a picked form and a source.
  expect(seeded).toBeDefined();
  expect(seeded.picked).toBeGreaterThan(0);
  expect(seeded.cited).toBeGreaterThan(0);

  await page.goto(`/admin/compendium?edit=${ingredientSlug('Beeswax', null)}`);
  const dialog = editIngredientDialog(page, 'Beeswax');
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
  await expect
    .poll(() => storedIdentity(seeded.id))
    .toEqual({ nomenclature: 'none', canonical_name: null });
});
