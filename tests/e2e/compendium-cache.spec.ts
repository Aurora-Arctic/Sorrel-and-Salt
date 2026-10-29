import { randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { test, expect } from './fixtures';
import { COMPENDIUM_CACHE_DATABASE, e2eDatabaseUrl } from './database';
import { signInAs } from './session';

// The compendium read answered from Next's data cache rather than Postgres, until an admin's write expires
// it. Runs only in the `chromium-compendium-cache` project, against the one e2e server that keeps its data
// cache, over a database no spec reseeds (claude-docs/db/compendium-cache.md, "In tests"). Nothing assumes
// the cache starts empty. Serial, because the second test reads what the first warmed and renamed.
test.describe.configure({ mode: 'serial' });

async function inDatabase<T>(work: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(e2eDatabaseUrl(COMPENDIUM_CACHE_DATABASE), { onnotice: () => {} });
  try {
    return await work(sql);
  } finally {
    await sql.end();
  }
}

const run = randomBytes(4).toString('hex');
const asAdmin = { database: COMPENDIUM_CACHE_DATABASE };

test('a repeat read of the compendium is answered from the cache, not Postgres', async ({
  page,
}) => {
  await signInAs(page, `reader-${run}@compendium-cache.test`, ['discord'], 'admin', asAdmin);
  await page.goto('/admin/compendium');
  const add = page.getByRole('link', { name: 'Add Ingredient' });
  await expect(add).toBeVisible();

  // Renamed underneath the cache to a name that sorts first, so a read of Postgres would put it on the
  // first page. A row is found by its name link, since its cell also holds the Quick Look eye.
  const renamed = `Aaa Fixture Cached ${run}`;
  await inDatabase(
    (sql) => sql`
      update ingredients set name = ${renamed}
      where id = (select id from ingredients
                  where workspace_id is null and deleted_at is null order by name, id limit 1)`,
  );

  await page.reload();
  await expect(add).toBeVisible();
  await expect(page.getByRole('link', { name: renamed, exact: true })).toHaveCount(0);

  // The control: a filter never read before misses the cache, so it reads
  // Postgres, which holds the rename.
  await page.goto(`/admin/compendium?query=${encodeURIComponent(renamed)}`);
  await expect(page.getByRole('link', { name: renamed, exact: true })).toBeVisible();
});

// An admin's write expires the tag, so the very next load reads
// Postgres — the admin's own entry, and the rename the cache was hiding above.
test('an admin edit is visible on the next page load', async ({ page }) => {
  await signInAs(page, `writer-${run}@compendium-cache.test`, ['discord'], 'admin', asAdmin);
  await page.goto('/admin/compendium');
  const add = page.getByRole('link', { name: 'Add Ingredient' });
  await expect(add).toBeVisible();

  // The precondition, from the test above: the cached list still hides the rename.
  const renamed = `Aaa Fixture Cached ${run}`;
  await expect(page.getByRole('link', { name: renamed, exact: true })).toHaveCount(0);

  // Unlike the rename, so the fuzzy duplicate warning does not stop the save.
  const added = 'Aab Testbloom';
  await add.click();
  const adding = page.getByRole('dialog', { name: 'Add Ingredient' });
  await adding.getByRole('textbox', { name: 'Name', exact: true }).fill(added);
  await adding.getByRole('combobox', { name: 'Classification' }).click();
  await adding
    .getByRole('listbox', { name: 'Classification choices' })
    .getByRole('option', { name: 'None' })
    .click();
  await adding.getByRole('button', { name: 'Save Ingredient' }).click();
  // The edit dialog, named by the entry's saved name, is the save landed.
  await expect(
    page.getByRole('dialog', { name: `Edit Ingredient, ${added}`, exact: true }),
  ).toBeVisible();

  await page.goto('/admin/compendium');
  await expect(page.getByRole('link', { name: added, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: renamed, exact: true })).toBeVisible();
});
