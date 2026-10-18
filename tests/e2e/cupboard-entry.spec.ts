import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';

// A compendium entry in a coven's cupboard (M12.16): the coven's page shows
// the coven's label and changes with the marks, and the public page of the
// same entry shows neither.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a member sees a held compendium entry with the coven’s label and marks, and the public page shows neither', async ({
  page,
  browser,
  baseURL,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Cupboard', 'coven-cupboard.test', {
    A: 'owner',
    B: 'member',
  });
  const admin = await browser.newPage({ baseURL });
  let ingredientId: string;
  try {
    const { userId } = await signInAs(admin, 'admin@coven-cupboard.test', ['discord'], 'admin');
    ingredientId = await withSql(async (sql) => {
      const id = await insertIngredient(
        sql,
        makeIngredient({
          name: 'Fixture Reference Wort',
          canonicalName: 'Fixtura cista',
          nomenclature: 'botanical',
          description: 'The compendium’s fixture herb.',
        }),
        userId,
      );
      await insertCupboardEntry(
        sql,
        {
          workspaceId: coven.id,
          ingredientId: id,
          label: 'Fixture Our Hedgewort',
          description: 'What our coven makes of it.',
        },
        coven.users.B,
      );
      return id;
    });
  } finally {
    await admin.close();
  }
  const [{ slug }] = await withSql(
    (sql) => sql<{ slug: string }[]>`select slug from ingredients where id = ${ingredientId}`,
  );

  // Why the page could have shown the compendium's values: the entry is live
  // and public, and the coven holds a row naming it.
  await page.goto(`/coven/${coven.slug}/ingredients/${ingredientId}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Fixture Our Hedgewort' }),
  ).toBeVisible();
  await expect(page.getByText('What our coven makes of it.')).toBeVisible();
  await expect(page.getByText('Fixture Reference Wort', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'From the Compendium' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Annotated' })).toBeVisible();
  await expect(page.getByText('Local', { exact: true })).toHaveCount(0);

  await page.goto(`/compendium/ingredients/${slug}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Fixture Reference Wort' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByText('Fixture Our Hedgewort')).toHaveCount(0);
});
