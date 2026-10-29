import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { compendiumList, rowOf, seedCoven, withSql } from './stories/coven-ingredients';
import { ADD, HELD } from '../support/cupboard-wording';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';

// The plus on the public compendium's cards asks the signed-in member's coven alone: an
// entry another coven holds is still offered unheld. The add itself, the check, its reload and a
// viewer's lack of either mark are story 14's (stories/02-compendium.spec.ts); the two-coven menu
// is the plus's component test's (tests/components/CompendiumCards/add-icon.test.tsx) and
// compendium-entry-cupboard.spec.ts's.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const NAME = 'Fixture Holdwort';

test('another coven’s member still sees the plus on an entry one coven holds: held is the coven’s own', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Add', 'compendium-add.test', { A: 'owner' });
  // seedCoven leaves the last coven's owner, D, signed in.
  const elsewhere = await seedCoven(page, 'Fixture Coven Elsewhere Add', 'compendium-add-x.test', {
    D: 'owner',
  });
  await withSql(async (sql) => {
    const ingredientId = await insertIngredient(
      sql,
      makeIngredient({ name: NAME, canonicalName: null, nomenclature: 'none' }),
      coven.users.A,
    );
    await insertCupboardEntry(sql, { workspaceId: coven.id, ingredientId }, coven.users.A);
  });
  const heldRows = (workspaceId: string) =>
    withSql(
      (sql) => sql<{ id: string }[]>`
        select e.id from workspace_compendium_entries e
        join ingredients i on i.id = e.ingredient_id
        where e.workspace_id = ${workspaceId} and i.name = ${NAME} and e.deleted_at is null`,
    );

  // Why the plus could have been the check: one coven does hold the entry.
  expect(await heldRows(coven.id)).toHaveLength(1);
  expect(await heldRows(elsewhere.id)).toHaveLength(0);

  await page.goto(`/compendium?query=${encodeURIComponent(NAME)}`);
  const card = rowOf(compendiumList(page), NAME);
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: ADD })).toBeVisible();
  await expect(card.getByRole('button', { name: HELD })).toHaveCount(0);
});
