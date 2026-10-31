import type { Page, Route } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { insertSpell, seedCoven, withSql } from './stories/coven-ingredients';
import type { Coven } from './stories/coven-ingredients';

// The wait on the Grimoire draws the Grimoire's own cards, not the Ingredients list's: each placeholder
// card is as tall as a real spell card and the grid has as many columns, at a desktop and a phone width.

/** How far a placeholder card may be from a real card's height: a line of text's worth. */
const HEIGHT_TOLERANCE = 12;

let coven: Coven;

test.beforeAll(async ({ browser }) => {
  await recreateE2eDatabase();
  const setup = await browser.newPage();
  try {
    coven = await seedCoven(setup, 'Fixture Coven Skeleton', 'grimoire-skeleton.test', {
      A: 'owner',
    });
    await withSql(async (sql) => {
      for (let n = 0; n < 8; n += 1) {
        await insertSpell(
          sql,
          coven.id,
          `Skeletonwort ${n}`,
          'workspace',
          coven.users.A,
          'complete',
        );
        await insertSpell(sql, coven.id, `Draftwort ${n}`, 'workspace', coven.users.A, 'draft');
      }
    });
  } finally {
    await setup.close();
  }
});

/** Holds back every server-component answer from `hold()` until `release()`, prefetches excepted. */
async function holdServerAnswers(page: Page) {
  const held: Route[] = [];
  let holding = false;
  await page.route('**/*', async (route) => {
    const headers = route.request().headers();
    const rsc = headers.rsc === '1' || new URL(route.request().url()).searchParams.has('_rsc');
    if (!holding || !rsc || headers['next-router-prefetch'] === '1') return route.fallback();
    held.push(route);
  });
  return {
    hold: () => {
      holding = true;
    },
    held: () => held.length,
    async release() {
      holding = false;
      for (const route of held.splice(0)) await route.fallback();
    },
  };
}

/** The first card's height and the column count of the card grid, in the skeleton or on the page. */
const cardGrid = (page: Page, waiting: boolean) =>
  page.evaluate((inSkeleton) => {
    const root = inSkeleton
      ? [...document.querySelectorAll('main output')].find(
          (output) => !output.closest('[aria-hidden="true"]'),
        )?.parentElement
      : document.querySelector('main');
    const grid = [...(root?.querySelectorAll<HTMLElement>('*') ?? [])].find(
      (element) => getComputedStyle(element).display === 'grid' && element.children.length > 2,
    );
    if (!grid) return null;
    return {
      columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      height: grid.children[0].getBoundingClientRect().height,
    };
  }, waiting);

for (const width of [1280, 375]) {
  test(`at ${width}px the Grimoire's wait draws spell-card-sized placeholders, from another section and between its tabs`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAgainAs(page, coven.users.A);
    const server = await holdServerAnswers(page);
    const waitingGrid = async () => {
      await expect.poll(server.held).toBeGreaterThan(0);
      await expect(page.getByRole('main').getByRole('status')).toHaveCount(1);
      await expect.poll(() => cardGrid(page, true)).not.toBeNull();
      return (await cardGrid(page, true))!;
    };

    // From another section.
    await page.goto(`/coven/${coven.slug}/members`);
    server.hold();
    await page
      .getByRole('navigation', { name: 'Coven' })
      .getByRole('link', { name: 'Grimoire', exact: true })
      .click();
    const fromSection = await waitingGrid();
    await server.release();
    await expect(page.getByRole('list', { name: 'Spells' })).toBeVisible();
    // Why the comparison means something: the page is at rest and has a real grid.
    const spells = (await cardGrid(page, false))!;
    expect(spells.height).toBeGreaterThan(0);

    // Between its tabs.
    server.hold();
    await page.getByRole('link', { name: 'Drafts', exact: true }).click();
    const betweenTabs = await waitingGrid();
    await server.release();
    await expect(page.getByRole('list', { name: 'Drafts' })).toBeVisible();

    for (const waiting of [fromSection, betweenTabs]) {
      expect(waiting.columns).toBe(spells.columns);
      expect(Math.abs(waiting.height - spells.height)).toBeLessThanOrEqual(HEIGHT_TOLERANCE);
    }
  });
}
