import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase, withE2eSql } from './database';
import { PUBLIC_WORD, helpRowState, seedHelpArticles } from './help-articles';
import { insertHelpArticle } from '../support/db/insert-help-article';
import { signInAs } from './session';

// The help search's matches, a page at a time, against the built server: every match is reachable through the
// shared pager, the address holds the words and the page, and a reader never pages onto a row their audience bars.

const WORD = 'tallowmere';
// More title matches than the search page ever drew in one read, so the weakest match falls past any first page.
const TITLE_MATCHES = 200;
const NOINDEX = /<meta[^>]+name="robots"[^>]+noindex/;
// Every seeded match's slug starts so, the rows a signed-out reader may not open included, so a leak is collected too.
const SLUG_PREFIX = `testwort-${WORD}-`;
// Holds the word in its body alone, which the score weighs below a title: it ranks last.
const LAST = `${SLUG_PREFIX}last`;
const STAFF = `${SLUG_PREFIX}staff`;
const KEEPER = `${SLUG_PREFIX}keeper`;
const MOST_PAGES = 30;

const titleMatch = (n: number) => `${SLUG_PREFIX}note-${String(n).padStart(3, '0')}`;
const publicHrefs = [
  ...Array.from({ length: TITLE_MATCHES }, (_, i) => `/help/${titleMatch(i + 1)}`),
  `/help/${LAST}`,
];

test.beforeAll(async () => {
  await recreateE2eDatabase();
  const author = await seedHelpArticles('author@help-search-pages.test');
  await withE2eSql(async (sql) => {
    for (let n = 1; n <= TITLE_MATCHES; n += 1) {
      await insertHelpArticle(
        sql,
        {
          title: `Testwort Tallowmere Note ${n}`,
          slug: titleMatch(n),
          audience: 'public',
          body: 'A fixture note.',
        },
        author,
      );
    }
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Ledger Afterword',
        slug: LAST,
        audience: 'public',
        body: `The ${WORD} closes the ledger.`,
      },
      author,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Tallowmere Staff Notes', slug: STAFF, audience: 'staff', body: 'Staff.' },
      author,
    );
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Tallowmere Keeper Notes',
        slug: KEEPER,
        audience: 'keeper',
        body: 'Keeper.',
      },
      author,
    );
  });
});

/** The seeded matches this page of results links, in the order drawn. */
const resultHrefs = async (page: Page): Promise<string[]> =>
  (
    await page
      .getByRole('main')
      .getByRole('link')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))
  ).filter((href) => href.includes(SLUG_PREFIX));

const pagerEnd = (page: Page, name: 'Prev' | 'Next') =>
  page.getByRole('main').getByRole('navigation', { name: 'Pages' }).getByRole('link', { name });

/** The Next link's address, or none on the last page or a page with no pager. */
async function nextHref(page: Page): Promise<string | null> {
  const next = pagerEnd(page, 'Next');
  return (await next.count()) === 0 ? null : next.getAttribute('href');
}

/** Every page of the search, from the first, each as the hrefs it links. */
async function walk(page: Page): Promise<string[][]> {
  const pages: string[][] = [];
  await page.goto(`/help/search?q=${WORD}`);
  for (let read = 0; read < MOST_PAGES; read += 1) {
    pages.push(await resultHrefs(page));
    const href = await nextHref(page);
    if (!href) break;
    await page.goto(href);
  }
  return pages;
}

test('a signed-out reader pages from the first match to the last, each once, and never onto a staff or keeper row', async ({
  page,
  browser,
  baseURL,
}) => {
  // Precondition: both rows are live and the words find them for a reader their audience admits.
  expect(await helpRowState(STAFF)).toBe('live');
  expect(await helpRowState(KEEPER)).toBe('live');
  const keeperContext = await browser.newContext({ baseURL });
  try {
    const keeperPage = await keeperContext.newPage();
    await signInAs(keeperPage, 'e@help-search-pages.test', ['discord'], 'admin');
    const reached = (await walk(keeperPage)).flat();
    expect(reached).toEqual(
      expect.arrayContaining([`/help/staff/${STAFF}`, `/help/staff/${KEEPER}`]),
    );
  } finally {
    await keeperContext.close();
  }

  const pages = await walk(page);
  const walked = pages.flat();

  expect(pages.length).toBeGreaterThan(1);
  expect(walked.filter((href) => href.includes(STAFF) || href.includes(KEEPER))).toEqual([]);
  expect(new Set(walked).size).toBe(walked.length);
  expect([...walked].sort()).toEqual([...publicHrefs].sort());
  expect(pages[pages.length - 1].slice(-1)[0]).toBe(`/help/${LAST}`);
});

test('the address holds the words and the page, so a reload shows the same page', async ({
  page,
}) => {
  await page.goto(`/help/search?q=${WORD}`);
  const first = await resultHrefs(page);
  // Precondition: the first page is drawn and another follows it.
  expect(first.length).toBeGreaterThan(0);

  await pagerEnd(page, 'Next').click();
  await expect(page).toHaveURL(/[?&]after=/);
  await expect.poll(async () => (await resultHrefs(page))[0]).not.toBe(first[0]);
  const second = await resultHrefs(page);
  const address = new URL(page.url());
  expect(address.pathname).toBe('/help/search');
  expect(address.searchParams.get('q')).toBe(WORD);
  expect(second.filter((href) => first.includes(href))).toEqual([]);

  await page.reload();

  expect(await resultHrefs(page)).toEqual(second);
  await expect(page.getByRole('main').getByRole('search').getByRole('searchbox')).toHaveValue(WORD);
});

test('a later page of results stays unindexed and uncached', async ({ page }) => {
  await page.goto(`/help/search?q=${WORD}`);
  const href = await nextHref(page);
  // Precondition: the page asked about is a later one.
  expect(href).toMatch(/[?&]after=/);

  const response = await page.request.get(href!);

  expect(response.status()).toBe(200);
  expect(await response.text()).toMatch(NOINDEX);
  const cacheControl = response.headers()['cache-control'];
  expect(cacheControl).toContain('no-store');
  expect(cacheControl).not.toMatch(/max-age=[1-9]|s-maxage/);
});

test('one page of matches draws no pager', async ({ page }) => {
  await page.goto(`/help/search?q=${PUBLIC_WORD}`);

  // Precondition: the words match, so the missing pager is not a missing list.
  await expect(
    page.getByRole('main').getByRole('link', { name: /Testwort Hearth Guide/ }),
  ).toBeVisible();
  await expect(page.getByRole('main').getByRole('navigation', { name: 'Pages' })).toHaveCount(0);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the pager is plain links: Next reaches the following matches, Prev the first page again', async ({
    page,
  }) => {
    await page.goto(`/help/search?q=${WORD}`);
    const first = await resultHrefs(page);
    expect(first.length).toBeGreaterThan(0);

    await pagerEnd(page, 'Next').click();

    await expect(page).toHaveURL(/[?&]after=/);
    expect(new URL(page.url()).searchParams.get('q')).toBe(WORD);
    const second = await resultHrefs(page);
    expect(second.length).toBeGreaterThan(0);
    expect(second.filter((href) => first.includes(href))).toEqual([]);

    await pagerEnd(page, 'Prev').click();

    await expect(page).toHaveURL(/[?&]before=/);
    expect(await resultHrefs(page)).toEqual(first);
  });
});
