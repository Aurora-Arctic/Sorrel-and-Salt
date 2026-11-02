import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { withSql } from './stories/coven-ingredients';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { slugify } from '@/lib/slugify';

// The share card a link preview fetches for a compendium entry, signed out: a PNG for a shown entry, and a
// 404 for every address the public entry read does not answer, so the card shows nothing the page would not.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
/**
 * The path of the card a shown entry's page names in its og:image. Next puts a build hash in the route's
 * folder name, so the test reads the address rather than writing it down.
 */
async function cardOf(request: import('@playwright/test').APIRequestContext, slug: string) {
  const html = await (await request.get(`/compendium/ingredients/${slug}`)).text();
  const content = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
  expect(content, `og:image on ${slug}`).toBeTruthy();
  const url = new URL(content!.replace(/&amp;/g, '&'));
  return url.pathname + url.search;
}

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

/** Seeds one entry with no formal name, so its slug is its name's, and returns that slug. */
async function seedEntry(
  author: string,
  name: string,
  where: { workspaceId?: string; shown?: boolean } = {},
): Promise<string> {
  return withSql(async (sql) => {
    const id = await insertIngredient(
      sql,
      makeIngredient({
        name,
        workspaceId: where.workspaceId ?? null,
        nomenclature: 'none',
        variants: [makeVariant()],
      }),
      author,
    );
    if (where.shown === false) {
      await sql.begin(async (tx) => {
        await tx`select set_config('app.current_user_id', ${author}, true)`;
        await tx`update ingredients set shown = false where id = ${id}`;
      });
    }
    const [row] = await sql`select slug, workspace_id, shown from ingredients where id = ${id}`;
    // Why the card could have answered: the row is live at the slug the test asks for.
    expect(row.slug).toBe(slugify(name));
    expect(row.workspace_id).toBe(where.workspaceId ?? null);
    expect(row.shown).toBe(where.shown ?? true);
    return row.slug as string;
  });
}

test("a shown entry's card is a PNG", async ({ page, browser, baseURL }) => {
  const author = await authorOf(browser, baseURL, 'author@share-card-png.test');
  const slug = await seedEntry(author, 'Fixture Card Shown');

  const response = await page.request.get(await cardOf(page.request, slug));
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/png');
  expect((await response.body()).subarray(0, 8)).toEqual(PNG_SIGNATURE);
});

test("a hidden entry, a coven's own entry and an unknown slug each answer 404", async ({
  page,
  browser,
  baseURL,
}) => {
  const author = await authorOf(browser, baseURL, 'author@share-card-404.test');
  const hidden = await seedEntry(author, 'Fixture Card Hidden', { shown: false });
  const coven = await seedEntry(author, 'Fixture Card Coven', { workspaceId: WORKSPACE_W_ID });

  // Why each could have answered: the same card route draws a shown entry, at the address its page names.
  const shown = await seedEntry(author, 'Fixture Card Beside');
  const card = await cardOf(page.request, shown);
  expect((await page.request.get(card)).status()).toBe(200);

  for (const slug of [hidden, coven, 'fixture-card-nothing-here']) {
    const address = card.replace(`/ingredients/${shown}/`, `/ingredients/${slug}/`);
    expect((await page.request.get(address)).status(), slug).toBe(404);
  }
});
