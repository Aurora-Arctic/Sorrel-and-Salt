import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { localIngredient, seedCoven, withSql } from './stories/coven-ingredients';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';

// A coven's own entry that replaces a compendium entry: an "In the Compendium" block links the public page
// by its title, with one ⓘ beside the heading saying why it is shown. Each test proves what no story walks.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a member sees a coven’s own entry link the compendium entry it replaces, with one ⓘ', async ({
  page,
  browser,
  baseURL,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Replaces', 'coven-replaces.test', {
    A: 'owner',
  });
  const admin = await browser.newPage({ baseURL });
  let compendiumId: string;
  let localId: string;
  try {
    const { userId } = await signInAs(admin, 'admin@coven-replaces.test', ['discord'], 'admin');
    [compendiumId, localId] = await withSql(async (sql) => [
      await insertIngredient(
        sql,
        makeIngredient({
          name: 'Fixture Reference Wort',
          canonicalName: 'Fixtura replacata',
          nomenclature: 'botanical',
        }),
        userId,
      ),
      (
        await localIngredient(sql, coven.id, coven.users.A, {
          name: 'Fixture Our Wort',
          canonicalName: 'Fixtura replacata',
          nomenclature: 'botanical',
        })
      ).ingredientId,
    ]);
  } finally {
    await admin.close();
  }
  const [{ slug }] = await withSql(
    (sql) => sql<{ slug: string }[]>`select slug from ingredients where id = ${compendiumId}`,
  );

  await page.goto(`/coven/${coven.slug}/ingredients/${localId}`);

  await expect(page.getByText('Local', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'In the Compendium' })).toBeVisible();
  const link = page
    .getByRole('list', { name: 'In the Compendium' })
    .getByRole('link', { name: /Fixture Reference Wort/ });
  await expect(link).toHaveAttribute('href', `/compendium/ingredients/${slug}`);
  const why = page.getByRole('button', { name: 'About In the Compendium' });
  await expect(why).toHaveCount(1);
  // The text is in the page while closed, so the list is described without opening the tip.
  await expect(page.getByRole('list', { name: 'In the Compendium' })).toHaveAccessibleDescription(
    /\S/,
  );
  await why.focus();
  // Open, the tip shows; Playwright's role queries skip it while it is hidden.
  await expect(page.getByRole('tooltip')).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

test('a non-member is refused a coven’s own entry by its id', async ({
  page,
  browser,
  baseURL,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Closed', 'coven-closed.test', {
    A: 'owner',
  });
  const held = await withSql((sql) =>
    localIngredient(sql, coven.id, coven.users.A, { name: 'Fixture Closed Wort' }),
  );
  // Why the 404 could have been a 200: the entry is live and the coven's own,
  // and its owner reads it.
  const [row] = await withSql(
    (sql) =>
      sql<
        { workspace_id: string }[]
      >`select workspace_id from ingredients where id = ${held.ingredientId}`,
  );
  expect(row.workspace_id).toBe(coven.id);
  expect((await page.goto(`/coven/${coven.slug}/ingredients/${held.ingredientId}`))?.status()).toBe(
    200,
  );

  const stranger = await browser.newPage({ baseURL });
  try {
    await signInAs(stranger, 'stranger@coven-closed.test');
    const response = await stranger.goto(`/coven/${coven.slug}/ingredients/${held.ingredientId}`);
    expect(response?.status()).toBe(404);
  } finally {
    await stranger.close();
  }
});
