import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { insertStock, seedCoven, withSql } from './stories/coven-ingredients';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertIngredient } from '../support/db/insert-ingredient';
import { variantIdOf } from '../support/db/read-variants';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';

// Make It Ours (M12.23): a member turns a compendium entry the coven holds
// into the coven's own, lands on the own entry's page, and the coven's jar
// went with it. The entry page lists no jars yet, so where the jar went is
// read from the database, by the id the page's address names.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a member makes a held compendium entry the coven’s own and lands on it, the jar moved', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Ownership', 'coven-ownership.test', {
    A: 'owner',
    B: 'member',
  });
  const { compendiumId, jarId } = await withSql(async (sql) => {
    const id = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Fixture Ownable Wort',
        canonicalName: 'Fixtura propria',
        nomenclature: 'botanical',
        variants: [makeVariant({ form: 'Root' })],
      }),
      coven.users.A,
    );
    await insertCupboardEntry(
      sql,
      { workspaceId: coven.id, ingredientId: id, label: 'Fixture Our Ownwort' },
      coven.users.B,
    );
    const jar = await insertStock(
      sql,
      coven.id,
      { ingredientId: id, variantId: await variantIdOf(sql, id, 'Root') },
      { quantity: 12, unit: 'g', threshold: 0 },
      coven.users.B,
    );
    return { compendiumId: id, jarId: jar };
  });

  // Why the button could be refused or absent: the entry is the compendium's,
  // the coven holds it, and the jar is on the compendium entry's form.
  await page.goto(`/coven/${coven.slug}/ingredients/${compendiumId}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture Our Ownwort' })).toBeVisible();
  await expect(page.getByText('Local', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Make It Ours' }).click();
  await page
    .getByRole('group', { name: 'Make It Ours' })
    .getByRole('button', { name: 'Make It Ours' })
    .click();

  const ownAddress = new RegExp(
    `/coven/${coven.slug}/ingredients/(?!${compendiumId})[0-9a-f-]{36}$`,
  );
  await expect(page).toHaveURL(ownAddress);
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture Our Ownwort' })).toBeVisible();
  await expect(page.getByText('Local', { exact: true }).first()).toBeVisible();

  const ownId = new URL(page.url()).pathname.split('/').pop();
  const [jar] = await withSql(
    (sql) => sql<{ ingredient_id: string; workspace_id: string | null }[]>`
      select s.ingredient_id, i.workspace_id from inventory_items s
      join ingredients i on i.id = s.ingredient_id
      where s.id = ${jarId}`,
  );
  expect(jar).toEqual({ ingredient_id: ownId, workspace_id: coven.id });

  // At a phone's width, the narrowest a section signs off at.
  await page.setViewportSize({ width: 375, height: 812 });
  await assertNoAccessibilityViolations(page);
});
