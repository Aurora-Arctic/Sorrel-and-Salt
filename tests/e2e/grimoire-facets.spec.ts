import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { assertNoSidewaysScroll } from './axe';
import { signInAgainAs } from './session';
import { insertSpell, openFilters, seedCoven, withSql } from './stories/coven-ingredients';
import { PHONE_WIDTH } from './breakpoints';

// The grimoire's Moon Phases, Days of the Week, Visibility and Coven Members facets and its Compact switch: the GET
// form filters by address before hydration, the maker is read as created_by, and a hidden spell's phase is
// never suggested. Spells are raw SQL, since the builder is not under test.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('the grimoire address filters by moon phase, visibility and maker, and a hidden phase is never suggested', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Facets', 'grimoire-facets.test', {
    A: 'owner',
    B: 'member',
  });
  await withSql(async (sql) => {
    const shared = await insertSpell(
      sql,
      coven.id,
      'Shared Full Moon Working',
      'workspace',
      coven.users.A,
      'complete',
    );
    const other = await insertSpell(
      sql,
      coven.id,
      'Shared Waning Working',
      'workspace',
      coven.users.B,
      'complete',
    );
    const mine = await insertSpell(
      sql,
      coven.id,
      'Private Full Moon Working',
      'private',
      coven.users.B,
      'complete',
    );
    await sql`update spells set moon_phase = 'Full Moon', day_of_week = 'Friday' where id in (${shared}, ${mine})`;
    await sql`update spells set moon_phase = 'Waning Crescent' where id = ${other}`;
    // Another member's private spell, whose moon phase B must never be offered.
    const hidden = await insertSpell(
      sql,
      coven.id,
      'Hidden Working',
      'private',
      coven.users.A,
      'complete',
    );
    await sql`update spells set moon_phase = 'New Moon' where id = ${hidden}`;
  });
  await signInAgainAs(page, coven.users.B);
  const path = `/coven/${coven.slug}/grimoire`;
  const items = () => page.getByRole('list', { name: 'Spells' }).getByRole('listitem');

  await page.goto(path);
  await expect(items()).toHaveCount(3);

  // The GET form's address filters before the page hydrates.
  await page.goto(`${path}?moonPhase=Full+Moon`);
  await expect(items()).toHaveCount(2);

  await page.goto(`${path}?visibility=private`);
  await expect(items()).toHaveCount(1);
  await expect(
    page.getByRole('link', { name: 'Private Full Moon Working', exact: true }),
  ).toBeVisible();

  // Made by A, not last edited by A: the maker is created_by.
  await page.goto(`${path}?maker=${coven.users.A}`);
  await expect(items()).toHaveCount(1);
  await expect(
    page.getByRole('link', { name: 'Shared Full Moon Working', exact: true }),
  ).toBeVisible();

  // Another member's private spell's phase is not a suggestion, though a phase B can see is.
  await page.goto(path);
  const panel = await openFilters(page);
  await panel.getByRole('combobox', { name: 'Moon Phases' }).fill('waning');
  await expect(page.getByRole('option', { name: /Waning Crescent/ })).toBeVisible();
  await panel.getByRole('combobox', { name: 'Moon Phases' }).fill('new');
  await expect(page.getByRole('option', { name: /New Moon/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
});

test('the Compact switch sets the grimoire list density and the filter is accessible', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Density', 'grimoire-density.test', {
    A: 'owner',
  });
  await withSql((sql) =>
    insertSpell(sql, coven.id, 'Fixture Density Working', 'workspace', coven.users.A, 'complete'),
  );
  await page.goto(`/coven/${coven.slug}/grimoire`);
  const list = page.getByRole('list', { name: 'Spells' });
  const compact = page.getByRole('search').getByRole('switch', { name: 'Compact' });
  await expect(compact).toBeChecked();
  await expect(list).toHaveAttribute('data-density', 'compact');
  await compact.uncheck();
  await expect(page.locator('html')).toHaveAttribute('data-card-density', 'regular');
  await openFilters(page);
});

test('at 375px the grimoire filter panel opens, a facet can be picked, and the page does not scroll sideways', async ({
  page,
}) => {
  await page.setViewportSize({ width: PHONE_WIDTH, height: 800 });
  const coven = await seedCoven(page, 'Fixture Coven Narrow', 'grimoire-narrow.test', {
    A: 'owner',
  });
  await withSql(async (sql) => {
    const id = await insertSpell(
      sql,
      coven.id,
      'Fixture Narrow Working',
      'workspace',
      coven.users.A,
      'complete',
    );
    await sql`update spells set moon_phase = 'Full Moon' where id = ${id}`;
  });
  await page.goto(`/coven/${coven.slug}/grimoire`);
  const panel = await openFilters(page);
  await panel.getByRole('combobox', { name: 'Moon Phases' }).fill('full');
  await page.getByRole('option', { name: /Full Moon/ }).click();
  await expect(panel.getByRole('button', { name: 'Remove Moon Phase: Full Moon' })).toBeVisible();
  await assertNoSidewaysScroll(page);
});

// A long grimoire, so the page has somewhere to scroll.
async function seedLongGrimoire(page: Page, name: string, domain: string) {
  const coven = await seedCoven(page, name, domain, { A: 'owner' });
  await withSql(async (sql) => {
    for (let n = 1; n <= 40; n += 1) {
      await insertSpell(
        sql,
        coven.id,
        `Fixture Long Working ${String(n).padStart(2, '0')}`,
        'workspace',
        coven.users.A,
        'complete',
      );
    }
  });
  return coven;
}

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

test('at 375px the page behind the open Filters sheet does not scroll, and scrolls again once it shuts', async ({
  page,
}) => {
  await page.setViewportSize({ width: PHONE_WIDTH, height: 500 });
  const coven = await seedLongGrimoire(page, 'Fixture Coven Scroll', 'grimoire-scroll.test');
  await page.goto(`/coven/${coven.slug}/grimoire`);

  // Precondition: with the sheet shut the page does scroll.
  await page.evaluate(() => window.scrollTo(0, 300));
  const before = await scrollY(page);
  expect(before).toBeGreaterThan(100);
  await page.mouse.move(20, 250);
  await page.mouse.wheel(0, 100);
  await expect.poll(() => scrollY(page)).toBeGreaterThan(before);
  await page.evaluate((y) => window.scrollTo(0, y), before);

  const panel = await openFilters(page);
  // Playwright scrolls the button into view to click it, so the position to hold is the one after opening.
  const held = await scrollY(page);
  await page.mouse.move(20, 250);
  await page.mouse.wheel(0, 400);
  await page.mouse.move(PHONE_WIDTH - 20, 480);
  await page.mouse.wheel(0, 400);
  // Wheels are handled in order, so once the sheet has moved under the last one the earlier ones are done.
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await scrollY(page)).toBe(held);
  // The sheet's `overscroll-behavior` alone keeps a wheel off the page, so the lock itself is read off the root.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
    'hidden',
  );

  // The sheet's own contents still scroll when taller than the screen.
  const sheetScrolls = await panel.evaluate((el) => el.scrollHeight > el.clientHeight);
  expect(sheetScrolls).toBe(true);
  await panel.evaluate((el) => el.scrollTo(0, 200));
  expect(await panel.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

  await panel.getByRole('button', { name: 'Close' }).last().click();
  await expect(panel).toBeHidden();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe(
    'hidden',
  );
  expect(await scrollY(page)).toBe(held);
  await page.mouse.wheel(0, 100);
  await expect.poll(() => scrollY(page)).toBeGreaterThan(held);
});

test('at the desktop width the page still scrolls while the Filters panel is open', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  const coven = await seedLongGrimoire(page, 'Fixture Coven Wide', 'grimoire-wide.test');
  await page.goto(`/coven/${coven.slug}/grimoire`);
  await openFilters(page);
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect.poll(() => scrollY(page)).toBeGreaterThan(100);
});
