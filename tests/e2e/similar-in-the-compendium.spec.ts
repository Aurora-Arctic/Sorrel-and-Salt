import type { Browser } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { insertStock, localIngredient, seedCoven, withSql } from './stories/coven-ingredients';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';

// A coven's own entry with no formal name (M12.22): a "Similar in the
// Compendium" block, and a radio for each entry with one Link to Selected button
// that, after a question, makes the own entry the compendium entry it matches. Each test here proves what no story walks.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

async function compendiumEntry(
  browser: Browser,
  baseURL: string | undefined,
  name: string,
  forms: string[],
  domain: string,
) {
  const admin = await browser.newPage({ baseURL });
  try {
    const { userId } = await signInAs(admin, `admin@${domain}`, ['discord'], 'admin');
    return await withSql((sql) =>
      insertIngredient(
        sql,
        makeIngredient({
          name,
          nomenclature: 'none',
          variants: forms.map((form) => makeVariant({ form })),
        }),
        userId,
      ),
    );
  } finally {
    await admin.close();
  }
}

test('a member makes an own entry the compendium entry it matches, jar and all', async ({
  page,
  browser,
  baseURL,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Similar', 'coven-similar.test', {
    A: 'owner',
  });
  const compendiumId = await compendiumEntry(
    browser,
    baseURL,
    'Fixture Similar Wort',
    ['Root'],
    'coven-similar.test',
  );
  const held = await withSql(async (sql) => {
    const own = await localIngredient(sql, coven.id, coven.users.A, {
      name: 'Fixture Similar Wort',
      nomenclature: 'none',
    });
    await insertStock(sql, coven.id, own, { quantity: 20, unit: 'g', threshold: 5 }, coven.users.A);
    return own;
  });

  await page.goto(`/coven/${coven.slug}/ingredients/${held.ingredientId}`);

  await expect(page.getByRole('heading', { name: 'Similar in the Compendium' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'About Similar in the Compendium' })).toHaveCount(
    1,
  );
  await expect(page.getByRole('heading', { name: 'In the Compendium', exact: true })).toHaveCount(
    0,
  );
  await assertNoAccessibilityViolations(page);

  await expect(page.getByRole('button', { name: 'Link to Selected' })).toBeDisabled();
  await page.getByText('Fixture Similar Wort', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Fixture Similar Wort' })).toBeChecked();
  await expect(page.getByRole('link', { name: /^Open Fixture Similar Wort/ })).toBeVisible();
  await page.getByRole('button', { name: 'Link to Selected' }).click();
  await assertNoAccessibilityViolations(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Link', exact: true }).click();

  await expect(page).toHaveURL(`/coven/${coven.slug}/ingredients/${compendiumId}`);
  const [jar] = await withSql(
    (sql) =>
      sql<{ ingredient_id: string }[]>`
        select ingredient_id from inventory_items
        where workspace_id = ${coven.id} and deleted_at is null`,
  );
  expect(jar.ingredient_id).toBe(compendiumId);
});

test('a refusal shows in the dialog and nothing moves', async ({ page, browser, baseURL }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const coven = await seedCoven(page, 'Fixture Coven Refused', 'coven-refused.test', {
    A: 'owner',
  });
  await compendiumEntry(browser, baseURL, 'Fixture Refused Wort', ['Root'], 'coven-refused.test');
  const held = await withSql(async (sql) => {
    // The coven's jar is of a Leaf, a form the compendium entry does not have.
    const own = await localIngredient(sql, coven.id, coven.users.A, {
      name: 'Fixture Refused Wort',
      nomenclature: 'none',
      variants: [makeVariant({ form: 'Leaf' })],
    });
    await insertStock(sql, coven.id, own, { quantity: 20, unit: 'g', threshold: 5 }, coven.users.A);
    return own;
  });
  const url = `/coven/${coven.slug}/ingredients/${held.ingredientId}`;

  await page.goto(url);
  await page.getByRole('radio', { name: 'Fixture Refused Wort' }).check();
  await page.getByRole('button', { name: 'Link to Selected' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Link', exact: true }).click();

  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await expect(page).toHaveURL(url);
  const [row] = await withSql(
    (sql) =>
      sql<{ ingredient_id: string }[]>`
        select ingredient_id from inventory_items
        where workspace_id = ${coven.id} and deleted_at is null`,
  );
  expect(row.ingredient_id).toBe(held.ingredientId);
});
