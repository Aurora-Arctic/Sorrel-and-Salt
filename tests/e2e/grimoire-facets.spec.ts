import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { assertNoAccessibilityViolations } from './axe';
import { signInAgainAs } from './session';
import {
  applyFilters,
  insertSpell,
  openFilters,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';

// The grimoire's Moon Phase, Day of Week, Visibility and Coven Member facets
// (M13.22), and its Compact switch. No numbered story walks them: story 56
// walks a private spell's listing. Spells are written as raw SQL because the
// builder is not what is under test; what the list shows is read from the page.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a member narrows the grimoire by moon phase, visibility and maker, and the picks reach the address', async ({
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
  const items = () => page.getByRole('list', { name: 'Grimoire' }).getByRole('listitem');

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

  // Picked in the panel, applied with Apply Filters.
  await page.goto(path);
  const panel = await openFilters(page);
  await expect(panel.getByRole('combobox', { name: 'Moon Phase' })).toBeVisible();
  await panel.getByRole('combobox', { name: 'Moon Phase' }).fill('waning');
  await page.getByRole('option', { name: /Waning Crescent/ }).click();
  await applyFilters(page, panel);
  await expect(page).toHaveURL(/moonPhase=Waning/);
  await expect(items()).toHaveCount(1);

  // Another member's private spell's phase is not a suggestion.
  const again = await openFilters(page);
  await again.getByRole('combobox', { name: 'Moon Phase' }).fill('new');
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
  const list = page.getByRole('list', { name: 'Grimoire' });
  const compact = page.getByRole('search').getByRole('switch', { name: 'Compact' });
  await expect(compact).toBeChecked();
  await expect(list).toHaveAttribute('data-density', 'compact');
  await compact.uncheck();
  await expect(page.locator('html')).toHaveAttribute('data-card-density', 'regular');
  await openFilters(page);
  await assertNoAccessibilityViolations(page);
});
