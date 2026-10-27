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
// went with it. Where the jar went is read from the database, by the id the
// page's address names; the entry page's own jar list (M12.29) is
// entry-stock.spec.ts's.

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

  // At a phone's width, the narrowest a section signs off at, for both scans.
  await page.setViewportSize({ width: 375, height: 812 });
  // Why the button could be refused or absent: the entry is the compendium's,
  // the coven holds it, and the jar is on the compendium entry's form.
  await page.goto(`/coven/${coven.slug}/ingredients/${compendiumId}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Fixture Our Ownwort' })).toBeVisible();
  await expect(page.getByText('Local', { exact: true })).toHaveCount(0);

  // By keyboard, as the entry asks: the three dots opened by ArrowDown, its
  // choice reached by the arrows and taken by Enter, then the dialog's answer.
  await page.getByRole('button', { name: 'More for Fixture Our Ownwort', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  const ours = page.getByRole('menuitem', { name: 'Make It Ours' });
  while (!(await ours.evaluate((item) => item === document.activeElement))) {
    await page.keyboard.press('ArrowDown');
  }
  await page.keyboard.press('Enter');
  const ask = page.getByRole('dialog', { name: 'Make It Ours' });
  await expect(ask).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await ask.getByRole('button', { name: 'Make It Ours' }).focus();
  await page.keyboard.press('Enter');

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

  await assertNoAccessibilityViolations(page);
});
