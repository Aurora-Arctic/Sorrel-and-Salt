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
      await insertSpell(sql, coven.id, SPELL_TITLE, 'workspace', coven.users.A, 'complete');
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

/** How far a placeholder region may be from the loaded page's, in either axis: a line of text's worth. */
const REGION_TOLERANCE = 12;
const SPELL_TITLE = 'Calm Charm';

type Box = { x: number; y: number; width: number; height: number };

/**
 * The boxes of a spell page's regions, in the skeleton (found by the skeleton's own shapes, which carry no
 * role) or on the loaded page (found by role and label).
 */
const recipeRegions = (page: Page, waiting: boolean) =>
  page.evaluate((inSkeleton) => {
    const box = (element: Element | null | undefined): Box | null => {
      if (!element) return null;
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };
    if (inSkeleton) {
      const root = [...document.querySelectorAll('output')].find(
        (output) =>
          !output.closest('[aria-hidden="true"]') &&
          output.parentElement?.querySelector('.skeleton__recipe'),
      )?.parentElement;
      const at = (selector: string) => box(root?.querySelector(selector));
      return {
        back: at('.skeleton__recipe-back'),
        edited: at('.skeleton__recipe-edited'),
        title: at('.skeleton__recipe-title'),
        actions: at('.skeleton__recipe-actions'),
        menu: at('.skeleton__recipe .skeleton__menu'),
        main: at('.skeleton__recipe-columns'),
        aside: at('.skeleton__recipe-aside'),
      };
    }
    const named = (role: string, name: string) =>
      [...document.querySelectorAll(`[role="${role}"], ${role}`)].find((element) =>
        (element.getAttribute('aria-label') ?? element.textContent ?? '').includes(name),
      );
    return {
      back: box(
        [...document.querySelectorAll('main a')].find((a) => a.textContent?.startsWith('Back to')),
      ),
      edited: box(document.querySelector('main .last-edit')),
      title: box(document.querySelector('main h1')),
      actions: box(document.querySelector('main h1')?.nextElementSibling),
      menu: box(named('nav', 'On This Page')),
      main: box(document.querySelector('.spell-recipe__columns')),
      aside: box(named('aside', 'The Cupboard')),
    };
  }, waiting);

for (const width of [1280, 375]) {
  test(`at ${width}px a spell page's wait has the loaded page's regions in their places`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAgainAs(page, coven.users.A);
    await page.goto(`/coven/${coven.slug}/grimoire`);
    const server = await holdServerAnswers(page);
    const link = page.getByRole('heading', { name: SPELL_TITLE }).getByRole('link');
    await expect(link).toBeVisible();
    server.hold();
    await link.click();
    await expect.poll(server.held).toBeGreaterThan(0);
    await expect.poll(async () => (await recipeRegions(page, true)).title).not.toBeNull();
    // The wait is pinned in the window wherever the page was scrolled to; at the top it stands where the arrived page does.
    await page.evaluate(() => window.scrollTo(0, 0));
    const waiting = await recipeRegions(page, true);
    await server.release();
    await expect(page.getByRole('heading', { level: 1, name: SPELL_TITLE })).toBeVisible();
    const loaded = await recipeRegions(page, false);

    for (const region of ['back', 'edited', 'title', 'actions', 'menu', 'main', 'aside'] as const) {
      const real = loaded[region];
      const shape = waiting[region];
      // Why the comparison means something: the loaded page has the region.
      expect(real, `${region} on the loaded page`).not.toBeNull();
      expect(shape, `${region} in the wait`).not.toBeNull();
      // On a phone the columns dissolve into the page (`display: contents`) and have no box of their own.
      if (region === 'main' && real!.width === 0) continue;
      expect(Math.abs(shape!.x - real!.x), `${region} left edge`).toBeLessThanOrEqual(
        REGION_TOLERANCE,
      );
      expect(Math.abs(shape!.y - real!.y), `${region} top edge`).toBeLessThanOrEqual(
        REGION_TOLERANCE,
      );
    }
    // The side column is as wide as the real one; the title and its icons end where the real ones do.
    expect(Math.abs(waiting.aside!.width - loaded.aside!.width)).toBeLessThanOrEqual(
      REGION_TOLERANCE,
    );
    expect(
      Math.abs(
        waiting.actions!.x + waiting.actions!.width - (loaded.actions!.x + loaded.actions!.width),
      ),
    ).toBeLessThanOrEqual(REGION_TOLERANCE);
  });

  test(`at ${width}px the Grimoire's wait holds the Compact switch where the loaded filter row does`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAgainAs(page, coven.users.A);
    await page.goto(`/coven/${coven.slug}/members`);
    const server = await holdServerAnswers(page);
    server.hold();
    await page
      .getByRole('navigation', { name: 'Coven' })
      .getByRole('link', { name: 'Grimoire', exact: true })
      .click();
    await expect.poll(server.held).toBeGreaterThan(0);
    const waiting = await page.evaluate(() => {
      const row = [...document.querySelectorAll('output')]
        .find(
          (output) =>
            !output.closest('[aria-hidden="true"]') &&
            output.parentElement?.querySelector('.skeleton__filter'),
        )
        ?.parentElement?.querySelector('.skeleton__filter');
      const last = row?.lastElementChild?.getBoundingClientRect();
      const whole = row?.getBoundingClientRect();
      return last && whole
        ? { x: last.x, y: last.y - whole.y, right: last.right, rowHeight: whole.height }
        : null;
    });
    await server.release();
    await expect(page.getByRole('list', { name: 'Spells' })).toBeVisible();
    const loaded = await page.evaluate(() => {
      const label = [...document.querySelectorAll('main label')].find(
        (l) => l.textContent === 'Compact',
      );
      const field = label?.parentElement?.getBoundingClientRect();
      const row = label?.closest('form')?.getBoundingClientRect();
      return field && row
        ? { x: field.x, y: field.y - row.y, right: field.right, rowHeight: row.height }
        : null;
    });
    expect(loaded, 'the loaded row has a Compact switch').not.toBeNull();
    expect(waiting, 'the wait has a last control').not.toBeNull();
    expect(Math.abs(waiting!.x - loaded!.x)).toBeLessThanOrEqual(REGION_TOLERANCE);
    expect(Math.abs(waiting!.right - loaded!.right)).toBeLessThanOrEqual(REGION_TOLERANCE);
    expect(Math.abs(waiting!.y - loaded!.y)).toBeLessThanOrEqual(REGION_TOLERANCE);
    expect(Math.abs(waiting!.rowHeight - loaded!.rowHeight)).toBeLessThanOrEqual(REGION_TOLERANCE);
  });
}
