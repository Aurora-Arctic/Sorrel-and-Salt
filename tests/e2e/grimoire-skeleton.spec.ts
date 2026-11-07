import type { Page, Route } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { insertSpell, seedCoven, withSql } from './stories/coven-ingredients';
import type { Coven } from './stories/coven-ingredients';

// The wait on the Grimoire draws the Grimoire's own cards, not the Ingredients list's: each placeholder
// card is as tall as a real spell card and the grid has as many columns, at a desktop and a phone width.
// At Compact, the wait's cards are as tall as the loaded compact cards.
// The wait on a spell page draws the recipe's own frame, where the spell will stand, under the page bar.

/** How far a placeholder card may be from a real card's height, in pixels. */
const HEIGHT_TOLERANCE = 2;

const SPELL_TITLE = 'Calm Charm';

let coven: Coven;

test.beforeAll(async ({ browser }) => {
  await recreateE2eDatabase();
  const setup = await browser.newPage();
  try {
    coven = await seedCoven(setup, 'Fixture Coven Skeleton', 'grimoire-skeleton.test', {
      A: 'owner',
    });
    await withSql(async (sql) => {
      // A typical card: an intent and three categories, which is what the placeholder is as tall as.
      const typical = async (title: string, status: 'draft' | 'complete') => {
        const id = await insertSpell(sql, coven.id, title, 'workspace', coven.users.A, status);
        await sql`update spells set intent = 'To keep the house and everyone under its roof safe through the winter.' where id = ${id}`;
        await sql`
          insert into spell_categories (spell_id, category_id, created_by, updated_by)
          select ${id}, id, ${coven.users.A}, ${coven.users.A}
          from categories where deleted_at is null order by name limit 3`;
      };
      await typical(SPELL_TITLE, 'complete');
      for (let n = 0; n < 8; n += 1) {
        await typical(`Skeletonwort ${n}`, 'complete');
        await typical(`Draftwort ${n}`, 'draft');
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
    // A draft card is taller than a complete one, so each wait is compared with its own tab's cards.
    const drafts = (await cardGrid(page, false))!;
    expect(drafts.height).toBeGreaterThan(spells.height);

    for (const [waiting, loaded] of [
      [fromSection, spells],
      [betweenTabs, drafts],
    ] as const) {
      expect(waiting.columns).toBe(loaded.columns);
      expect(Math.abs(waiting.height - loaded.height)).toBeLessThanOrEqual(HEIGHT_TOLERANCE);
    }
  });
}

for (const width of [1280, 375]) {
  test(`at ${width}px with the Grimoire set to Compact, its wait draws compact cards as tall as the loaded ones`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAgainAs(page, coven.users.A);
    await page.goto(`/coven/${coven.slug}/grimoire`);
    await expect(page.getByRole('list', { name: 'Spells' })).toBeVisible();
    const compact = page.getByRole('main').getByLabel('Compact', { exact: true });
    await expect(compact).toBeChecked();

    // Each tab's loaded cards at Compact and at Regular. Why the comparison means something: Compact (the
    // default) draws a shorter card than Regular.
    const measure = async () => {
      const loaded = (await cardGrid(page, false))!;
      await compact.uncheck();
      await expect(compact).not.toBeChecked();
      await expect
        .poll(async () => (await cardGrid(page, false))!.height)
        .toBeGreaterThan(loaded.height);
      const regular = (await cardGrid(page, false))!;
      await compact.check();
      await expect(compact).toBeChecked();
      await expect.poll(async () => (await cardGrid(page, false))!.height).toBe(loaded.height);
      return { loaded, regular };
    };
    const server = await holdServerAnswers(page);
    const waitingAt = async (tab: string) => {
      server.hold();
      await page.getByRole('link', { name: tab, exact: true }).click();
      await expect.poll(server.held).toBeGreaterThan(0);
      await expect(
        page
          .getByRole('main')
          .getByRole('status')
          .filter({ hasText: /^Loading$/ }),
      ).toHaveCount(1);
      await expect.poll(() => cardGrid(page, true)).not.toBeNull();
      const waiting = (await cardGrid(page, true))!;
      await server.release();
      await expect(page.getByRole('list', { name: tab })).toBeVisible();
      await expect(compact).toBeChecked();
      return waiting;
    };

    const spells = await measure();
    const waitingForDrafts = await waitingAt('Drafts');
    const drafts = await measure();
    const waitingForSpells = await waitingAt('Spells');

    test.info().annotations.push({
      type: 'card heights',
      description: JSON.stringify({ spells, waitingForSpells, drafts, waitingForDrafts }),
    });
    for (const [waiting, { loaded, regular }] of [
      [waitingForSpells, spells],
      [waitingForDrafts, drafts],
    ] as const) {
      expect(waiting.columns).toBe(loaded.columns);
      expect(Math.abs(waiting.height - loaded.height)).toBeLessThanOrEqual(HEIGHT_TOLERANCE);
      // Why the match is Compact's: the wait is nearer Compact than Regular.
      expect(Math.abs(waiting.height - loaded.height)).toBeLessThan(
        Math.abs(waiting.height - regular.height),
      );
    }
  });
}

/** How far the waiting page's frame may be from the loaded page's, in either axis: a line of text's worth. */
const FRAME_TOLERANCE = 12;

/**
 * The page bar is `aria-hidden`, empty and outside the main landmark, so it is found by that structure: `rest` notes the
 * empty hidden marks drawn at rest, `wait` counts the ones drawn since (the bar), and `after` how many of those are still drawn.
 */
const pageBars = (page: Page, step: 'rest' | 'wait' | 'after') =>
  page.evaluate((at) => {
    const drawn = [...document.querySelectorAll<HTMLElement>('[aria-hidden="true"]:empty')].filter(
      (mark) => {
        if (mark.closest('main') || mark.hidden) return false;
        const { width, height } = mark.getBoundingClientRect();
        return width > 0 && height > 0;
      },
    );
    const noted = window as unknown as { atRest?: Set<Element>; bars?: Element[] };
    if (at === 'rest') {
      noted.atRest = new Set(drawn);
      return 0;
    }
    if (at === 'wait') {
      noted.bars = drawn.filter((mark) => !noted.atRest?.has(mark));
      return noted.bars.length;
    }
    return (noted.bars ?? []).filter((mark) => drawn.includes(mark as HTMLElement)).length;
  }, step);

for (const width of [1280, 375]) {
  test(`at ${width}px a spell page's wait draws the recipe's own frame under the page bar, and gives way to the spell`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInAgainAs(page, coven.users.A);
    await page.goto(`/coven/${coven.slug}/grimoire`);
    const server = await holdServerAnswers(page);
    const link = page.getByRole('heading', { name: SPELL_TITLE }).getByRole('link');
    await expect(link).toBeVisible();
    await pageBars(page, 'rest');

    server.hold();
    await link.click();
    await expect.poll(server.held).toBeGreaterThan(0);

    // The held list is hidden from readers, so what the main landmark holds now is the wait alone.
    await expect(page.getByRole('list', { name: 'Spells' })).toHaveCount(0);
    const main = page.getByRole('main');
    await expect(main.getByRole('status').filter({ hasText: /^Loading$/ })).toHaveCount(1);
    await expect(main.getByRole('heading', { level: 1 })).toHaveAccessibleName('Loading');
    // The recipe's own frame, with no spell in it yet to name it.
    const frame = main.getByRole('article');
    await expect(frame).toBeVisible();
    await expect(frame).toHaveAccessibleName('');
    // The page bar shows once the wait has lasted its delay.
    await expect.poll(() => pageBars(page, 'wait')).toBe(1);
    // The wait is pinned in the window wherever the page was scrolled to; at the top it stands where the arrived page does.
    await page.evaluate(() => window.scrollTo(0, 0));
    const waiting = await frame.boundingBox();

    await server.release();

    const spell = page.getByRole('article', { name: SPELL_TITLE });
    await expect(page.getByRole('heading', { level: 1, name: SPELL_TITLE })).toBeVisible();
    await expect(spell).toBeVisible();
    await expect(main.getByRole('status').filter({ hasText: /^Loading$/ })).toHaveCount(0);
    await expect.poll(() => pageBars(page, 'after')).toBe(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    const loaded = await spell.boundingBox();
    // Why the comparison means something: both frames were drawn.
    expect(waiting, 'the wait has a frame').not.toBeNull();
    expect(loaded, 'the spell has a frame').not.toBeNull();
    expect(Math.abs(waiting!.x - loaded!.x)).toBeLessThanOrEqual(FRAME_TOLERANCE);
    expect(Math.abs(waiting!.y - loaded!.y)).toBeLessThanOrEqual(FRAME_TOLERANCE);
    expect(Math.abs(waiting!.width - loaded!.width)).toBeLessThanOrEqual(FRAME_TOLERANCE);
  });
}
