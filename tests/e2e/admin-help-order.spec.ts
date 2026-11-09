import { randomUUID } from 'node:crypto';
import type { Locator, Page } from '@playwright/test';
import postgres from 'postgres';
import { insertHelpArticle } from '../support/db/insert-help-article';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAs } from './session';

// Ordering on Keepers › Help: Reorder Mode moves a guide among its own audience's and saves the whole order at each move;
// a guide's sub pages and the FAQ save each drop at once (claude-docs/components/help-outline.md, "Reorder Mode" and
// "Ordering").

const PATH = '/keepers/help';
const ASH = 'Testwort Ash Guide';
const BIRCH = 'Testwort Birch Guide';
const CEDAR = 'Testwort Cedar Guide';
const ASH_ONE = 'Testwort Ash Kindling';
const ASH_TWO = 'Testwort Ash Embers';
const FAQ_ONE = 'Why Testwort Ash?';
const FAQ_TWO = 'Why Testwort Birch?';
const MINE = [ASH, BIRCH, CEDAR, ASH_ONE, ASH_TWO, FAQ_ONE, FAQ_TWO];

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  const author = randomUUID();
  try {
    await sql.begin(async (tx) => {
      // The privilege trigger refuses an undeclared keeper; this is the route a `psql` fix declares.
      await tx`select set_config('app.privilege_route', 'manual', true)`;
      await tx`
        insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
        values (${author}, 'Fixture Author', 'author@admin-help-order.test', true, 'admin', true, ${author}, ${author})`;
    });
    const ash = await insertHelpArticle(
      sql,
      { kind: 'guide', title: ASH, slug: 'testwort-ash-guide', audience: 'public', position: 101 },
      author,
    );
    await insertHelpArticle(
      sql,
      {
        kind: 'guide',
        title: BIRCH,
        slug: 'testwort-birch-guide',
        audience: 'public',
        position: 102,
      },
      author,
    );
    await insertHelpArticle(
      sql,
      {
        kind: 'guide',
        title: CEDAR,
        slug: 'testwort-cedar-guide',
        audience: 'staff',
        position: 103,
      },
      author,
    );
    await insertHelpArticle(
      sql,
      { title: ASH_ONE, slug: 'testwort-ash-kindling', parent_id: ash, position: 1 },
      author,
    );
    await insertHelpArticle(
      sql,
      { title: ASH_TWO, slug: 'testwort-ash-embers', parent_id: ash, position: 2 },
      author,
    );
    await insertHelpArticle(
      sql,
      { title: FAQ_ONE, slug: 'why-testwort-ash', kind: 'faq', position: 101 },
      author,
    );
    await insertHelpArticle(
      sql,
      { title: FAQ_TWO, slug: 'why-testwort-birch', kind: 'faq', position: 102 },
      author,
    );
  } finally {
    await sql.end();
  }
});

const said = (page: Page, text: RegExp | string) =>
  page.getByRole('status').filter({ hasText: text });

/** The fixture's own titles among the texts, in the order given, whatever else the seed holds. */
const mine = (texts: string[]) =>
  texts.map((text) => MINE.find((title) => text.includes(title))).filter(Boolean);

const nav = (page: Page) => page.getByRole('navigation', { name: 'Help Outline' });
const audienceList = (page: Page, audience: string) =>
  nav(page).getByRole('list', { name: audience, exact: true });

/** Lifts a grip by keyboard, moves it one place up, and puts it down, waiting on what dnd-kit says at each key. */
async function moveUp(page: Page, grip: Locator, name: string): Promise<void> {
  await grip.focus();
  await page.keyboard.press('Space');
  await expect(said(page, `Picked up ${name}`)).toBeAttached();
  // dnd-kit starts listening for the moving keys in a timer set at the lift.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve)));
  await page.keyboard.press('ArrowUp');
  await expect(said(page, `${name} moved to`)).toBeAttached();
  await page.keyboard.press('Space');
  await expect(said(page, `${name} put down at`)).toBeAttached();
}

test('a keeper reorders the guides within their audience, and each move saves at the drop', async ({
  page,
}) => {
  await signInAs(page, 'e@admin-help-order.test', ['discord'], 'admin');
  await page.goto(PATH);
  // Precondition: Ash before Birch, both public, and Cedar under Staff.
  await expect
    .poll(async () => mine(await audienceList(page, 'Public').getByRole('link').allTextContents()))
    .toEqual([ASH, BIRCH]);
  await expect(audienceList(page, 'Staff').getByRole('link', { name: CEDAR })).toBeVisible();

  await nav(page).getByRole('button', { name: 'Reorder' }).click();
  await expect(said(page, 'Reorder mode.')).toBeAttached();
  await expect(nav(page).getByRole('button', { name: 'Reorder' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(nav(page).getByRole('button', { name: /Save Order|Cancel/ })).toHaveCount(0);
  await assertNoAccessibilityViolations(page);

  // Pressing Reorder again leaves the mode with the saved order as it was.
  await nav(page).getByRole('button', { name: 'Reorder' }).click();
  await expect(said(page, 'Reorder mode ended.')).toBeAttached();
  await expect
    .poll(async () => mine(await audienceList(page, 'Public').getByRole('link').allTextContents()))
    .toEqual([ASH, BIRCH]);

  // A staff guide moved up stays among the staff guides, whatever sits above it.
  await nav(page).getByRole('button', { name: 'Reorder' }).click();
  const cedar = audienceList(page, 'Staff').getByRole('button', { name: `Move ${CEDAR}` });
  await cedar.focus();
  await page.keyboard.press('Space');
  await expect(said(page, `Picked up ${CEDAR}`)).toBeAttached();
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve)));
  await page.keyboard.press('Home');
  await expect(said(page, `${CEDAR} moved to`)).toBeAttached();
  await page.keyboard.press('Space');
  // The drop saves at once, and the grips are off until it lands.
  await expect(said(page, `Moved ${CEDAR}`)).toBeAttached();
  await expect(nav(page).getByRole('button', { name: `Move ${BIRCH}` })).toBeEnabled();
  await expect(
    audienceList(page, 'Staff').getByRole('button', { name: `Move ${CEDAR}` }),
  ).toBeVisible();
  await expect(
    audienceList(page, 'Public').getByRole('button', { name: `Move ${CEDAR}` }),
  ).toHaveCount(0);

  // Birch above Ash saves at the drop, with no Save to press; the page read afresh holds it.
  await moveUp(page, nav(page).getByRole('button', { name: `Move ${BIRCH}` }), BIRCH);
  await expect(said(page, 'Moved ' + BIRCH)).toBeAttached();
  await nav(page).getByRole('button', { name: 'Reorder' }).click();
  await expect(nav(page).getByRole('button', { name: 'Reorder' })).toBeFocused();
  await page.reload();
  await expect
    .poll(async () => mine(await audienceList(page, 'Public').getByRole('link').allTextContents()))
    .toEqual([BIRCH, ASH]);
});

test('a keeper drops a sub page above another, and the guide keeps the order', async ({ page }) => {
  await signInAs(page, 'e2@admin-help-order.test', ['discord'], 'admin');
  await page.goto(PATH);
  await nav(page).getByRole('link', { name: ASH }).click();
  const table = page.getByRole('table', { name: `Sub Pages of ${ASH}` });
  const titles = () => table.getByRole('rowheader').allTextContents();
  // Precondition: Kindling first, and no Move Up or Move Down left to press.
  await expect.poll(async () => mine(await titles())).toEqual([ASH_ONE, ASH_TWO]);
  await expect(table.getByRole('button', { name: /Move Up|Move Down/ })).toHaveCount(0);
  await assertNoAccessibilityViolations(page);

  await moveUp(page, table.getByRole('button', { name: `Move ${ASH_TWO}` }), ASH_TWO);
  await expect(said(page, `Moved ${ASH_TWO} to position 1.`)).toBeAttached();
  await page.reload();
  await expect.poll(async () => mine(await titles())).toEqual([ASH_TWO, ASH_ONE]);
});

test('a keeper drops an FAQ entry above another, and the FAQ keeps the order', async ({ page }) => {
  await signInAs(page, 'e3@admin-help-order.test', ['discord'], 'admin');
  await page.goto(`${PATH}?view=faq`);
  const table = page.getByRole('table', { name: 'FAQ' });
  const titles = () => table.getByRole('rowheader').allTextContents();
  await expect.poll(async () => mine(await titles())).toEqual([FAQ_ONE, FAQ_TWO]);
  await assertNoAccessibilityViolations(page);

  await moveUp(page, table.getByRole('button', { name: `Move ${FAQ_TWO}` }), FAQ_TWO);
  await expect(
    said(page, new RegExp(`^Moved ${FAQ_TWO.replace('?', '\\?')} to position`)),
  ).toBeAttached();
  await page.reload();
  await expect.poll(async () => mine(await titles())).toEqual([FAQ_TWO, FAQ_ONE]);
});
