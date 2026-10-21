import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { localIngredient, seedCoven, withSql } from './stories/coven-ingredients';
import { insertIngredient } from '../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../support/db/insert-reference';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';
import { slugify } from '@/lib/slugify';

// The public compendium entry page (M8.19; MB.80): what it answers a visitor
// with no account. Each test here proves what no story walks. Story 14 reads
// the page signed out; story 17 shows a non-admin its content with no Edit.
// These are the two answers a story does not reach: the 404 for a coven's own
// slug, and the 308 for a slug that has moved. Every test reads as the
// signed-out visitor, which is the `page`; the rows are written by a user made
// on a page of its own.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** A user to stamp the rows with, signed in on a page that is closed again at once. */
async function authorOf(
  browser: import('@playwright/test').Browser,
  baseURL: string | undefined,
  email: string,
): Promise<string> {
  const author = await browser.newPage({ baseURL });
  try {
    return (await signInAs(author, email, ['discord'], 'admin')).userId;
  } finally {
    await author.close();
  }
}

test('a coven’s own ingredient has no public page: its slug answers 404 to a visitor', async ({
  page,
  browser,
  baseURL,
}) => {
  const maker = await browser.newPage({ baseURL });
  const [coven, row] = await (async () => {
    try {
      const seeded = await seedCoven(
        maker,
        'Fixture Coven Entry 404',
        'compendium-entry-404.test',
        {
          A: 'owner',
        },
      );
      const rows = await withSql(async (sql) => {
        const held = await localIngredient(sql, seeded.id, seeded.users.A, {
          name: 'Fixture Wroot Hidden',
          nomenclature: 'none',
        });
        return sql<{ slug: string; workspace_id: string | null }[]>`
          select slug, workspace_id from ingredients where id = ${held.ingredientId}`;
      });
      return [seeded, rows[0]] as const;
    } finally {
      await maker.close();
    }
  })();
  // Why the 404 could have been a 200: the row is live, and it is the coven's own, not the compendium's.
  expect(row.workspace_id).toBe(coven.id);

  const response = await page.goto(`/compendium/ingredients/${row.slug}`);

  expect(response?.status()).toBe(404);
  await expect(page.getByText('Fixture Wroot Hidden')).toHaveCount(0);
});

test('a slug an entry has moved off answers 308 to its current address', async ({
  page,
  browser,
  baseURL,
}) => {
  const author = await authorOf(browser, baseURL, 'author@compendium-entry-308.test');
  const name = 'Fixture Moved Bramble';
  const was = slugify(name);
  const now = `${was}-renamed`;
  await withSql(async (sql) => {
    const id = await insertIngredient(
      sql,
      makeIngredient({ name, nomenclature: 'none', variants: [makeVariant()] }),
      author,
    );
    // What a rename leaves, written as the compendium's own update writes it
    // (claude-docs/db/ingredient-slugs.md): the new slug on the entry, the old
    // one retired with its window open.
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${author}, true)`;
      await tx`update ingredients set slug = ${now} where id = ${id}`;
      await tx`
        insert into retired_ingredient_slugs (ingredient_id, slug, created_by, updated_by)
        values (${id}, ${was}, ${author}, ${author})`;
    });
  });

  // Why the 308 is the redirect's: the current address answers 200, and the old one holds no entry.
  expect((await page.request.get(`/compendium/ingredients/${now}`)).status()).toBe(200);

  const moved = await page.request.get(`/compendium/ingredients/${was}`, { maxRedirects: 0 });

  expect(moved.status()).toBe(308);
  expect(moved.headers()['location']).toMatch(new RegExp(`/compendium/ingredients/${now}$`));
  // A browser must not keep the move: the slug can be handed to a new entry (MB.84). Next sends
  // `max-age=0` inside `no-store`; what is refused is any lifetime above zero.
  const headers = moved.headers();
  expect(headers['cache-control']).toContain('no-store');
  expect(headers['cache-control']).not.toMatch(/max-age=[1-9]/);
  expect(headers['expires']).toBeUndefined();
  expect(headers['last-modified']).toBeUndefined();
});

test('a visitor reads an entry with its details and each form, on a page that fits a phone', async ({
  page,
  browser,
  baseURL,
}) => {
  const author = await authorOf(browser, baseURL, 'author@compendium-entry-page.test');
  const name = 'Fixture Public Bramble';
  const slug = slugify(name);
  await withSql((sql) =>
    insertIngredient(
      sql,
      makeIngredient({
        name,
        nomenclature: 'none',
        variants: [makeVariant({ form: 'Fixture Root' })],
      }),
      author,
    ),
  );

  const response = await page.goto(`/compendium/ingredients/${slug}`);

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Details' })).toBeVisible();
  await expect(page.locator(`#form-${slugify('Fixture Root')}`)).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await assertNoSidewaysScroll(page);
});

// A citation prints its url as plain text, Chicago's form, and a url with no
// hyphen or space is one long word with nowhere a line may break: unbroken, a
// long one ran past a phone's column (MB.120). The bibliography lets it break
// anywhere instead.
test('a source with a long url wraps inside the column on a phone', async ({
  page,
  browser,
  baseURL,
}) => {
  const author = await authorOf(browser, baseURL, 'author@compendium-entry-url.test');
  const name = 'Fixture Long Sourced Sedge';
  const url = `https://fixtures.example/${'averylongpathsegmentwithnobreak'.repeat(5)}/testwort?edition=1`;
  await withSql(async (sql) => {
    const ingredient = await insertIngredient(
      sql,
      makeIngredient({ name, nomenclature: 'none', variants: [] }),
      author,
    );
    const reference = await insertReference(
      sql,
      {
        kind: 'web_page',
        title: 'A Fixture Page With a Long Address',
        url,
        accessed: '2026-01-01',
      },
      author,
    );
    await insertReferenceLink(sql, ingredient, reference, author);
  });

  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto(`/compendium/ingredients/${slugify(name)}`);

  const bibliography = page.getByRole('list', { name: 'Bibliography' });
  await expect(bibliography).toContainText(url);
  await expect(bibliography.getByRole('link', { name: /^Open the Source/ })).toHaveAttribute(
    'href',
    url,
  );
  await assertNoSidewaysScroll(page);
});
