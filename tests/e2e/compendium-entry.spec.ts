import { test, expect } from './fixtures';
import { assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';
import { signInKeeperOnSidePage } from './session';
import { withSql } from './stories/coven-ingredients';
import { insertIngredient } from '../support/db/insert-ingredient';
import { insertReference, insertReferenceLink } from '../support/db/insert-reference';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';
import { slugify } from '@/lib/slugify';

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a slug an entry has moved off answers 308 to its current address', async ({
  page,
  browser,
  baseURL,
}) => {
  const author = await signInKeeperOnSidePage(browser, baseURL, 'author@compendium-entry-308.test');
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
  // A browser must not keep the move: the slug can be handed to a new entry. Next sends
  // `max-age=0` inside `no-store`; what is refused is any lifetime above zero.
  const headers = moved.headers();
  expect(headers['cache-control']).toContain('no-store');
  expect(headers['cache-control']).not.toMatch(/max-age=[1-9]/);
  expect(headers['expires']).toBeUndefined();
  expect(headers['last-modified']).toBeUndefined();
});

// A citation prints its url as plain text, and a url with no hyphen or space is one long word that ran
// past a phone's column, so the bibliography lets it break anywhere.
test('a visitor reads an entry with its details and each form on a phone, a long source url wrapping inside the column', async ({
  page,
  browser,
  baseURL,
}) => {
  const author = await signInKeeperOnSidePage(browser, baseURL, 'author@compendium-entry-url.test');
  const name = 'Fixture Long Sourced Sedge';
  const url = `https://fixtures.example/${'averylongpathsegmentwithnobreak'.repeat(5)}/testwort?edition=1`;
  await withSql(async (sql) => {
    const ingredient = await insertIngredient(
      sql,
      makeIngredient({
        name,
        nomenclature: 'none',
        variants: [makeVariant({ form: 'Fixture Root' })],
      }),
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
  const response = await page.goto(`/compendium/ingredients/${slugify(name)}`);

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Details' })).toBeVisible();
  await expect(page.locator(`#form-${slugify('Fixture Root')}`)).toBeVisible();
  // The disclaimer line under the details' notes and under the form's, though neither has any.
  await expect(page.getByRole('link', { name: 'Read the Disclaimer' })).toHaveCount(2);
  const bibliography = page.getByRole('list', { name: 'Bibliography' });
  await expect(bibliography).toContainText(url);
  await expect(bibliography.getByRole('link', { name: /^Open the Source/ })).toHaveAttribute(
    'href',
    url,
  );
  await assertNoSidewaysScroll(page);
});

// Needs Review is the warning ochre, not the red the attention badge draws, read from the page's own tokens.
test('an entry no curator has reviewed wears Needs Review in the theme warning colour, not the attention red', async ({
  page,
  browser,
  baseURL,
}) => {
  const author = await signInKeeperOnSidePage(
    browser,
    baseURL,
    'author@compendium-entry-review-mark.test',
  );
  const name = 'Fixture Unreviewed Yarrow';
  await withSql(async (sql) => {
    await insertIngredient(
      sql,
      makeIngredient({ name, nomenclature: 'none', variants: [makeVariant()] }),
      author,
    );
  });

  // Dark, where the palette's ink is the theme's warning itself; light darkens it for its edge.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(`/compendium/ingredients/${slugify(name)}`);
  const badge = page.locator('.badge', { hasText: 'Needs Review' }).first();
  await expect(badge).toBeVisible();

  const { ink, warning, attention } = await badge.evaluate((element) => {
    const resolve = (value: string): string => {
      const probe = document.createElement('span');
      probe.style.color = value;
      document.body.append(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      return resolved;
    };
    return {
      ink: getComputedStyle(element).color,
      warning: resolve(getComputedStyle(document.documentElement).getPropertyValue('--warning')),
      attention: resolve(
        getComputedStyle(document.documentElement).getPropertyValue('--badge-attention-fill'),
      ),
    };
  });

  expect(ink).toBe(warning);
  expect(ink).not.toBe(attention);
});
