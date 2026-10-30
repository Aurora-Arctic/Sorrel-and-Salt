import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { slotUrl } from './slots';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';
import { insertIngredient } from '../support/db/insert-ingredient';
import {
  cardsIn,
  compendiumList,
  ingredientList,
  localIngredient,
  searchCovenList,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';

// An entry's "Back to …" link returns to the search, filters and page the entry was opened from. It reads the
// tab's history through the Navigation API, past the browser floor, so without it the link is the bare list;
// under `npm run e2e:audit` Firefox and Safari pass the history checks only on a build with the API.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

// The cards page by 24 (`CARD_PAGE_SIZE`); 44 entries give a second page long enough to scroll.
const ENTRIES = 44;
const SEARCH = 'Backwort';
const nameOf = (n: number) => `Fixture ${SEARCH} ${String(n).padStart(2, '0')}`;

const pagerOf = (page: Page) => page.getByRole('navigation', { name: 'Pages' });
const backLink = (page: Page) => page.getByRole('link', { name: /^Back to / });
const cardLink = (card: Locator) => card.getByRole('heading').getByRole('link');

/** The address as a link names it: path and query, no origin. */
const pathAndQuery = (address: string) => {
  const url = new URL(address);
  return `${url.pathname}${url.search}`;
};

/**
 * The repro: search the list, go to page 2, scroll a card to the middle of the window and open
 * it. Returns the page-2 list's address and the opened card's top as it was, for the return.
 */
async function openFromSecondPage(page: Page, list: Locator, entryPath: RegExp) {
  await searchCovenList(page, SEARCH);
  await expect(pagerOf(page).getByText('Page 1 of 2')).toBeVisible();
  await pagerOf(page).getByRole('link', { name: 'Next' }).click();
  await expect(pagerOf(page).getByText('Page 2 of 2')).toBeVisible();

  const listAddress = pathAndQuery(page.url());
  // Why the return could fail: the list holds a search and a cursor that the bare list does not.
  const url = new URL(page.url());
  expect(url.searchParams.get('query')).toBe(SEARCH);
  expect(url.searchParams.get('after')).not.toBeNull();

  const card = cardsIn(list).nth(12);
  const name = await cardLink(card).innerText();
  await card.evaluate((node) => {
    node.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  const scrolled = await page.evaluate(() => window.scrollY);
  expect(scrolled).toBeGreaterThan(0);
  const top = (await card.boundingBox())!.y;

  await cardLink(card).click();
  await expect(page).toHaveURL(entryPath);
  return { listAddress, entryAddress: page.url(), name: name.trim(), top };
}

/** Presses Back to … and checks the list is the one left, with the card where it was. */
async function returnToList(
  page: Page,
  list: Locator,
  { listAddress, name, top }: { listAddress: string; name: string; top: number },
) {
  await expect(backLink(page)).toHaveAttribute('href', listAddress);
  await backLink(page).click();
  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === listAddress);
  await expect(pagerOf(page).getByText('Page 2 of 2')).toBeVisible();
  const card = cardsIn(list).filter({ has: page.getByRole('link', { name }) });
  await expect(card).toBeInViewport();
  await expect
    .poll(async () => Math.abs((await card.boundingBox())!.y - top), { timeout: 5_000 })
    .toBeLessThanOrEqual(4);
}

test.describe('the compendium', () => {
  test.beforeAll(async ({ browser, slot }) => {
    const setup = await browser.newPage({ baseURL: slotUrl(slot) });
    try {
      const { userId } = await signInAs(setup, 'author@back-link.test');
      await withSql(async (sql) => {
        for (let n = 1; n <= ENTRIES; n += 1) {
          await insertIngredient(
            sql,
            makeIngredient({
              name: nameOf(n),
              nomenclature: 'none',
              variants: [makeVariant({ form: 'Herb' })],
            }),
            userId,
          );
        }
      });
    } finally {
      await setup.close();
    }
  });

  test('Back to Compendium returns to the searched second page, with the card where it was', async ({
    page,
  }) => {
    await page.goto('/compendium');
    const opened = await openFromSecondPage(
      page,
      compendiumList(page),
      /\/compendium\/ingredients\//,
    );
    await returnToList(page, compendiumList(page), opened);
  });

  test('opened directly, or from another page, Back to Compendium is the bare list', async ({
    page,
  }) => {
    await page.goto('/compendium');
    await searchCovenList(page, SEARCH);
    const entry = (await cardLink(cardsIn(compendiumList(page)).first()).getAttribute('href'))!;

    // Opened with no page before it.
    const fresh = await page.context().newPage();
    await fresh.goto(entry);
    await expect(backLink(fresh)).toHaveAttribute('href', '/compendium');
    await fresh.close();

    // Opened from a page that is not the list: the site's home.
    await page.goto('/');
    await page.goto(entry);
    await expect(backLink(page)).toHaveAttribute('href', '/compendium');
    // Why the bare list is the link's own choice: the tab's history does hold an earlier page.
    expect(await page.evaluate(() => window.history.length)).toBeGreaterThan(1);
  });
});

test.describe("a coven's Ingredients page", () => {
  test('Back to Ingredients returns to the searched second page, with the card where it was', async ({
    page,
  }) => {
    const coven = await seedCoven(page, 'Fixture Coven Backwort', 'back-link-coven.test', {
      A: 'owner',
    });
    await withSql(async (sql) => {
      for (let n = 1; n <= ENTRIES; n += 1) {
        await localIngredient(sql, coven.id, coven.users.A, {
          name: nameOf(n),
          nomenclature: 'none',
        });
      }
    });
    const listPath = `/coven/${coven.slug}/ingredients`;

    await page.goto(listPath);
    const opened = await openFromSecondPage(
      page,
      ingredientList(page),
      new RegExp(`${listPath}/[^/?]+$`),
    );
    await returnToList(page, ingredientList(page), opened);

    // Opened directly, with no page before it, the link is the bare list.
    const fresh = await page.context().newPage();
    await fresh.goto(opened.entryAddress);
    await expect(backLink(fresh)).toHaveAttribute('href', listPath);
    await fresh.close();
  });
});
