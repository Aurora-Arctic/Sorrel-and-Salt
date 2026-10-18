import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';
import { ingredientSlug } from '@/lib/slugify';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';

// The delete confirm's coven count (M12.25): a curator about to delete a
// compendium entry sees how many covens hold it. Nothing else walks this.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a curator opening the delete confirm sees the covens using the entry, with no accessibility violations', async ({
  page,
  browser,
  baseURL,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const first = await seedCoven(page, 'Fixture Coven Count One', 'count-one.test', { A: 'owner' });
  const second = await seedCoven(page, 'Fixture Coven Count Two', 'count-two.test', {
    A: 'owner',
  });
  const fixture = makeIngredient({
    name: 'Fixture Countwort',
    canonicalName: 'Fixtura numerata',
    nomenclature: 'botanical',
  });

  const helper = await browser.newPage({ baseURL });
  try {
    const { userId } = await signInAs(helper, 'seeder@count-delete.test', ['discord'], 'admin');
    await withSql(async (sql) => {
      const ingredientId = await insertIngredient(sql, fixture, userId);
      for (const coven of [first, second]) {
        await insertCupboardEntry(sql, { workspaceId: coven.id, ingredientId }, userId);
      }
    });
  } finally {
    await helper.close();
  }

  await signInAs(page, 'count-curator@count-delete.test', ['discord'], 'curator');
  await page.goto(`/admin/compendium?edit=${ingredientSlug(fixture.name, fixture.canonicalName)}`);
  const dialog = page.getByRole('dialog', { name: /^Edit Ingredient, Fixture Countwort/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete Ingredient' }).click();

  const question = dialog.getByRole('group', { name: /Delete/ });
  await expect(question.getByRole('status')).toContainText('2');
  await assertNoAccessibilityViolations(page);
});
