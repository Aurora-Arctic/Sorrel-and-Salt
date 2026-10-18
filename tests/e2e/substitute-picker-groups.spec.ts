import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';
import { openAddIngredient } from './stories/ingredient-dialogs';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';

// The substitute picker's two groups (M12.19): what the coven holds first, as
// "Your Ingredients", then the rest of the compendium. Each test here proves
// what no story walks.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('the picker lists a coven’s cupboard under Your Ingredients and the rest under Compendium', async ({
  page,
  browser,
  baseURL,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Picker', 'coven-picker.test', {
    A: 'owner',
  });
  const admin = await browser.newPage({ baseURL });
  try {
    const { userId } = await signInAs(admin, 'admin@coven-picker.test', ['discord'], 'admin');
    await withSql(async (sql) => {
      const held = await insertIngredient(
        sql,
        makeIngredient({ name: 'Fixture Pickwort', nomenclature: 'none' }),
        userId,
      );
      await insertIngredient(
        sql,
        makeIngredient({ name: 'Fixture Pickwort Leaf', nomenclature: 'none' }),
        userId,
      );
      await insertIngredient(
        sql,
        makeIngredient({
          name: 'Fixture Pickwort Own',
          nomenclature: 'none',
          workspaceId: coven.id,
        }),
        coven.users.A,
      );
      await insertCupboardEntry(
        sql,
        { workspaceId: coven.id, ingredientId: held, label: 'Fixture Crone Pick' },
        coven.users.A,
      );
    });
  } finally {
    await admin.close();
  }

  await page.goto(`/coven/${coven.slug}`);
  const dialog = await openAddIngredient(page);
  const box = dialog.getByRole('combobox', { name: 'Substitute Ingredient', exact: true });
  await box.fill('pickwort');

  const yours = page.getByRole('group', { name: 'Your Ingredients' });
  const compendium = page.getByRole('group', { name: 'Compendium' });
  // The held entry reads under the label the coven gave it, once, and the
  // compendium group holds only what the coven has no row for.
  await expect(yours.getByRole('option', { name: /^Fixture Crone Pick/ })).toHaveCount(1);
  await expect(yours.getByRole('option', { name: /^Fixture Pickwort Own/ })).toHaveCount(1);
  await expect(yours.getByRole('option')).toHaveCount(2);
  await expect(compendium.getByRole('option', { name: /^Fixture Pickwort Leaf/ })).toHaveCount(1);
  await expect(compendium.getByRole('option')).toHaveCount(1);
  // Yours first.
  const headings = await page.getByRole('listbox').getByRole('group').all();
  expect(headings).toHaveLength(2);
  await expect(headings[0]).toHaveAccessibleName('Your Ingredients');
});
