import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import {
  applyFilters,
  chooseChip,
  compendiumList,
  openFilters,
  rowOf,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';

// The public compendium's In My Covens filter: the panel lists the viewer's covens, a pick narrows the list and
// is kept in the address, Not In lists the entries none holds, a foreign coven's id narrows nothing, and a
// signed-out visitor is offered no filter.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const QUERY = 'Mycovwort';
const HELD = 'Mycovwort Held';
const VIEWED = 'Mycovwort Viewed';
const FOREIGN = 'Mycovwort Foreign';
const FREE = 'Mycovwort Free';
const ALL = [HELD, VIEWED, FOREIGN, FREE];

const OWN = 'Fixture Coven Mine';
const VIEWER_OF = 'Fixture Coven Viewed';
const ELSEWHERE = 'Fixture Coven Elsewhere';

/** The names of the cards the list shows, sorted. */
async function shown(page: Page): Promise<string[]> {
  const list = compendiumList(page);
  const names: string[] = [];
  for (const name of ALL) if ((await rowOf(list, name).count()) > 0) names.push(name);
  return names.sort();
}

async function open(page: Page, covens: readonly string[] = []): Promise<void> {
  const params = new URLSearchParams({ query: QUERY });
  for (const id of covens) params.append('covens', id);
  await page.goto(`/compendium?${params}`);
  await expect(compendiumList(page)).toBeVisible();
}

test('In My Covens narrows the compendium to the entries the viewer’s covens hold', async ({
  page,
  browser,
  baseURL,
}) => {
  const mine = await seedCoven(page, OWN, 'my-covens.test', { A: 'owner' });
  const viewed = await seedCoven(page, VIEWER_OF, 'my-covens-v.test', { V: 'owner' });
  const elsewhere = await seedCoven(page, ELSEWHERE, 'my-covens-x.test', { D: 'owner' });
  const A = mine.users.A;
  const D = elsewhere.users.D;

  const admin = await browser.newPage({ baseURL });
  try {
    const { userId } = await signInAs(admin, 'admin@my-covens.test', ['discord'], 'admin');
    await withSql(async (sql) => {
      // A is a viewer in the second coven: every membership counts, a viewer's included.
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${viewed.id}, ${A}, 'viewer', ${viewed.users.V}, ${viewed.users.V})`;
      const entry = (name: string) =>
        insertIngredient(
          sql,
          makeIngredient({ name, canonicalName: null, nomenclature: 'none' }),
          userId,
        );
      const [held, seen, foreign] = [await entry(HELD), await entry(VIEWED), await entry(FOREIGN)];
      await entry(FREE);
      await insertCupboardEntry(sql, { workspaceId: mine.id, ingredientId: held }, A);
      await insertCupboardEntry(
        sql,
        { workspaceId: viewed.id, ingredientId: seen },
        viewed.users.V,
      );
      await insertCupboardEntry(sql, { workspaceId: elsewhere.id, ingredientId: foreign }, D);
    });
  } finally {
    await admin.close();
  }

  await test.step('the foreign coven really holds its entry: its own member’s filter shows it', async () => {
    // Why ignoring its id below is the guard's doing, not an empty coven's.
    await signInAgainAs(page, D);
    await open(page, [elsewhere.id]);
    expect(await shown(page)).toEqual([FOREIGN]);
  });

  await signInAgainAs(page, A);

  await test.step('picking none lists the whole compendium', async () => {
    await open(page);
    expect(await shown(page)).toEqual([...ALL].sort());
  });

  await test.step('the panel lists the viewer’s covens by name, and only theirs', async () => {
    const panel = await openFilters(page);
    await panel.getByRole('combobox', { name: 'In My Covens' }).click();
    await expect(page.getByRole('option', { name: OWN })).toBeVisible();
    await expect(page.getByRole('option', { name: VIEWER_OF })).toBeVisible();
    await expect(page.getByRole('option', { name: ELSEWHERE })).toHaveCount(0);
  });

  await test.step('picking one coven narrows the list and the address keeps it', async () => {
    await page.getByRole('option', { name: OWN }).click();
    await applyFilters(page, page.getByRole('dialog', { name: 'Filters' }));
    expect(new URL(page.url()).searchParams.getAll('covens')).toEqual([mine.id]);
    await expect(rowOf(compendiumList(page), FREE)).toHaveCount(0);
    expect(await shown(page)).toEqual([HELD]);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

    await page.reload();
    await expect(compendiumList(page)).toBeVisible();
    expect(await shown(page)).toEqual([HELD]);
  });

  await test.step('Not In lists the entries none of the picked covens holds, or none of the viewer’s', async () => {
    const panel = await openFilters(page);
    await chooseChip(panel.getByRole('group', { name: 'Covens' }), 'Not In');
    await applyFilters(page, panel);
    expect(new URL(page.url()).searchParams.get('covensNot')).toBe('1');
    await expect(rowOf(compendiumList(page), HELD)).toHaveCount(0);
    expect(await shown(page)).toEqual([FOREIGN, FREE, VIEWED].sort());

    // With no coven picked: none of the viewer's covens, the one A only views included.
    await page.goto(`/compendium?query=${QUERY}&covensNot=1`);
    await expect(compendiumList(page)).toBeVisible();
    expect(await shown(page)).toEqual([FOREIGN, FREE].sort());

    // A foreign coven's id, the only one named, filters nothing under Not In either.
    await page.goto(`/compendium?query=${QUERY}&covens=${elsewhere.id}&covensNot=1`);
    await expect(compendiumList(page)).toBeVisible();
    expect(await shown(page)).toEqual([...ALL].sort());
  });

  await test.step('a foreign coven’s id in the address narrows nothing', async () => {
    await open(page, [elsewhere.id]);
    expect(await shown(page)).toEqual([...ALL].sort());
    await open(page, [mine.id, elsewhere.id]);
    expect(await shown(page)).toEqual([HELD]);
  });

  await test.step('a visitor signed out is offered no In My Covens, and the address filters nothing', async () => {
    // The session rides in a header as well as a cookie (session.ts, holdSession); both go.
    await page.context().setExtraHTTPHeaders({});
    await page.context().clearCookies();
    await open(page, [mine.id]);
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign In' })).toBeVisible();
    expect(await shown(page)).toEqual([...ALL].sort());
    const panel = await openFilters(page);
    await expect(panel.getByRole('combobox', { name: 'In My Covens' })).toHaveCount(0);
  });
});
