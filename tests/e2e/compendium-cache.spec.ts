import { randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { test, expect } from './fixtures';
import { COMPENDIUM_CACHE_DATABASE, e2eDatabaseUrl } from './database';
import { signInAs } from './session';

// The compendium read answered from Next's data cache, not Postgres, until a keeper's write expires it. Runs
// only in the `chromium-compendium-cache` project, against the one server that keeps its cache over a database
// no spec reseeds (claude-docs/db/compendium-cache.md, "In tests"); serial, since the second test reads what the first warmed.
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
  await page.goto('/curator/compendium');
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

  await page.goto(`/curator/compendium?query=${encodeURIComponent(renamed)}`);
  await expect(page.getByRole('link', { name: renamed, exact: true })).toBeVisible();
});

test('an admin edit is visible on the next page load', async ({ page }) => {
  await signInAs(page, `writer-${run}@compendium-cache.test`, ['discord'], 'admin', asAdmin);
  await page.goto('/curator/compendium');
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
  await expect(
    page.getByRole('dialog', { name: `Edit Ingredient, ${added}`, exact: true }),
  ).toBeVisible();

  await page.goto('/curator/compendium');
  await expect(page.getByRole('link', { name: added, exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: renamed, exact: true })).toBeVisible();
});

test("an entry's share card is drawn once, until a keeper edit draws it again", async ({
  page,
}) => {
  await signInAs(page, `carder-${run}@compendium-cache.test`, ['discord'], 'admin', asAdmin);
  // Clear of the row the first test renamed, which sorts first.
  const [entry] = await inDatabase(
    (sql) => sql<{ id: string; slug: string }[]>`
      select id, slug from ingredients
      where workspace_id is null and deleted_at is null and shown and name not like 'Aa%'
      order by name, id limit 1`,
  );
  const html = await (await page.request.get(`/compendium/ingredients/${entry.slug}`)).text();
  const content = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
  expect(content).toBeTruthy();
  const image = new URL(content!.replace(/&amp;/g, '&'));
  const card = image.pathname + image.search;
  const draw = async () => {
    const response = await page.request.get(card);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    return response.body();
  };

  const first = await draw();
  // Renamed underneath the cache, keeping the slug: a fresh draw would print the new name.
  await inDatabase(
    (sql) => sql`update ingredients set name = 'Quietly Renamed Fixture' where id = ${entry.id}`,
  );
  expect(await draw()).toEqual(first);

  await page.goto('/curator/compendium');
  const add = page.getByRole('link', { name: 'Add Ingredient' });
  await add.click();
  // Unlike the rename, so the fuzzy duplicate warning does not stop the save.
  const added = 'Aac Lumenwick';
  const adding = page.getByRole('dialog', { name: 'Add Ingredient' });
  await adding.getByRole('textbox', { name: 'Name', exact: true }).fill(added);
  await adding.getByRole('combobox', { name: 'Classification' }).click();
  await adding
    .getByRole('listbox', { name: 'Classification choices' })
    .getByRole('option', { name: 'None' })
    .click();
  await adding.getByRole('button', { name: 'Save Ingredient' }).click();
  await expect(
    page.getByRole('dialog', { name: `Edit Ingredient, ${added}`, exact: true }),
  ).toBeVisible();

  const redrawn = await draw();
  expect(redrawn).not.toEqual(first);
  expect(await draw()).toEqual(redrawn);
});
