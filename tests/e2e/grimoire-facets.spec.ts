import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { assertNoAccessibilityViolations } from './axe';
import { signInAgainAs } from './session';
import { insertSpell, openFilters, seedCoven, withSql } from './stories/coven-ingredients';

// The grimoire's Moon Phase, Day of Week, Visibility and Coven Member facets and its Compact switch: the GET
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
  await panel.getByRole('combobox', { name: 'Moon Phase' }).fill('waning');
  await expect(page.getByRole('option', { name: /Waning Crescent/ })).toBeVisible();
  await panel.getByRole('combobox', { name: 'Moon Phase' }).fill('new');
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
  await assertNoAccessibilityViolations(page);
});

test('at 375px the grimoire filter panel opens, a facet can be picked, and the page does not scroll sideways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
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
  await panel.getByRole('combobox', { name: 'Moon Phase' }).fill('full');
  await page.getByRole('option', { name: /Full Moon/ }).click();
  await expect(panel.getByRole('button', { name: 'Remove Moon Phase: Full Moon' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
