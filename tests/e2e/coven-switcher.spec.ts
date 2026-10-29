import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { makeIngredient } from '../support/fixtures/ingredient';
import { insertIngredient } from '../support/db/insert-ingredient';
import { type Coven, localIngredient, seedCoven, withSql } from './stories/coven-ingredients';

// The coven switcher keeps the page it can: it lands on the same page in the coven picked if that exists,
// and otherwise on the same section. Component tests prove the choice of address and the service proves
// which covens an entry opens in; this walks the real layout and router, so the address it lands on is served.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** A coven where user `A` owns it and, in a second one, is only a member: so A reads both. */
async function twoCovens(page: Page, label: string): Promise<{ alpha: Coven; beta: Coven }> {
  const alpha = await seedCoven(page, `Fixture Coven ${label} Alpha`, `${label}-alpha.test`, {
    A: 'owner',
  });
  const beta = await seedCoven(page, `Fixture Coven ${label} Beta`, `${label}-beta.test`, {
    O: 'owner',
  });
  await withSql((sql) =>
    sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${beta.users.O}, true)`;
      await tx`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${beta.id}, ${alpha.users.A}, 'member', ${beta.users.O}, ${beta.users.O})`;
    }),
  );
  return { alpha, beta };
}

const switcher = (page: Page) => page.getByRole('combobox', { name: 'Coven' });

async function switchTo(page: Page, name: string): Promise<void> {
  await switcher(page).click();
  await page.getByRole('option', { name }).click();
}

test('a compendium entry stays open when the switcher picks a coven that has never held it', async ({
  page,
}) => {
  const { alpha, beta } = await twoCovens(page, 'switch-entry');
  const id = await withSql((sql) =>
    insertIngredient(
      sql,
      makeIngredient({ name: 'Fixture Switchwort', canonicalName: null, nomenclature: 'none' }),
      alpha.users.A,
    ),
  );
  // Why the entry could have been left behind: neither coven names it in its cupboard.
  const [{ held }] = await withSql(
    (sql) => sql<{ held: number }[]>`
      select count(*)::int as held from workspace_compendium_entries where ingredient_id = ${id}`,
  );
  expect(held).toBe(0);

  await signInAgainAs(page, alpha.users.A);
  await page.goto(`/coven/${alpha.slug}/ingredients/${id}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Fixture Switchwort');

  await switchTo(page, 'Fixture Coven switch-entry Beta');

  await expect(page).toHaveURL(new RegExp(`/coven/${beta.slug}/ingredients/${id}$`));
  await expect(switcher(page)).toContainText('Fixture Coven switch-entry Beta');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Fixture Switchwort');
});

test("a coven's own entry is not carried to another coven, where it would be a 404", async ({
  page,
}) => {
  const { alpha, beta } = await twoCovens(page, 'switch-own');
  const own = await withSql((sql) => localIngredient(sql, alpha.id, alpha.users.A));

  await signInAgainAs(page, alpha.users.A);
  await page.goto(`/coven/${alpha.slug}/ingredients/${own.ingredientId}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Testwort');

  await switchTo(page, 'Fixture Coven switch-own Beta');

  await expect(page).toHaveURL(new RegExp(`/coven/${beta.slug}/ingredients$`));
  await expect(switcher(page)).toContainText('Fixture Coven switch-own Beta');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Ingredients', level: 1 })).toBeVisible();
});

test('invitations, an owner’s page, lands a member of the next coven on its members page, not a 404', async ({
  page,
}) => {
  const { alpha, beta } = await twoCovens(page, 'switch-people');

  await signInAgainAs(page, alpha.users.A);
  await page.goto(`/coven/${alpha.slug}/invitations`);
  await expect(page).toHaveURL(new RegExp(`/coven/${alpha.slug}/invitations$`));
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Members');

  await switchTo(page, 'Fixture Coven switch-people Beta');

  await expect(page).toHaveURL(new RegExp(`/coven/${beta.slug}/members$`));
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Members');
});
