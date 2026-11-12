import { randomBytes, randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { mintedLinks } from './cards';
import { recreateE2eDatabase, withE2eSql } from './database';
import { signInAs } from './session';

// A sheet of ten cards minted today (live, or revoked), written straight to the slot database so a test that only reads the tab
// need not mint through the dialog. Only the hash is stored, so these cards cannot be redeemed.
async function insertCardBatch(
  sql: postgres.Sql,
  author: string,
  revoked = false,
): Promise<string> {
  const batchId = randomUUID();
  await sql.begin(async (tx) => {
    await tx`select set_config('app.current_user_id', ${author}, true)`;
    for (let position = 1; position <= 10; position += 1) {
      await tx`
        insert into invitations ${tx({
          kind: 'card',
          batch_id: batchId,
          position,
          token_hash: randomBytes(32).toString('hex'),
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          revoked_at: revoked ? new Date() : null,
          created_by: author,
          updated_by: author,
        })}
      `;
    }
  });
  return batchId;
}

// Who may mint is tests/modules/identity's. Each test signs in as its own address: a worker keeps one database across the file's tests.
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('an admin mints a sheet of cards, downloads the PDF, and the Invitation Cards tab lists the batch', async ({
  page,
}) => {
  await signInAs(page, 'cards-admin-mint@admin-cards.test', ['discord'], 'admin');
  await page.goto('/keepers/invitation-cards');
  const batches = page.getByRole('button', { name: /^Revoke Batch / });
  const before = await batches.count();

  await page.getByRole('link', { name: 'Mint Cards' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mint Cards' });
  await dialog.getByRole('spinbutton', { name: 'Number of Sheets' }).fill('1');
  await expect(dialog.getByText('10 cards', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Mint Cards' }).click();
  await expect(dialog.getByText(/10 cards minted/)).toBeVisible();

  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog.getByText(/You haven't downloaded the PDF/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep Open' }).click();
  await expect(dialog.getByRole('button', { name: 'Download PDF' })).toBeVisible();

  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download PDF' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await dialog.getByRole('button', { name: 'Done' }).click();

  await expect(dialog).toBeHidden();
  await expect(batches).toHaveCount(before + 1);
  await assertNoAccessibilityViolations(page);
});

test('the Invitation Cards tab filters batches by status and Minted day without violations', async ({
  page,
}) => {
  const { userId } = await signInAs(
    page,
    'cards-admin-filter@admin-cards.test',
    ['discord'],
    'admin',
  );
  const [live, revoked] = await withE2eSql(async (sql) => [
    await insertCardBatch(sql, userId),
    await insertCardBatch(sql, userId, true),
  ]);
  // A batch is named by the first block of its id.
  const liveName = live.slice(0, 8);
  const revokedName = revoked.slice(0, 8);
  await page.goto('/keepers/invitation-cards');

  await page.getByRole('button', { name: /^Filters/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Filters' });
  await expect(drawer).toBeVisible();
  await drawer.getByRole('combobox', { name: 'Status' }).click();
  await page.getByRole('option', { name: 'Live' }).click();
  // The batch was minted today, so the Today pick keeps it; the range's calendar is checked open.
  await drawer.getByRole('button', { name: /^Minted/ }).click();
  const minted = page.getByRole('dialog', { name: 'Choose Minted Days' });
  await expect(minted).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await minted.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(minted).toBeHidden();
  await assertNoAccessibilityViolations(page);
  await drawer.getByRole('button', { name: 'Apply Filters' }).click();
  await expect(page).toHaveURL(
    /status=live&mintedFrom=\d{4}-\d{2}-\d{2}&mintedTo=\d{4}-\d{2}-\d{2}/,
  );
  await expect(page.getByRole('button', { name: /^Filters\D*2/ })).toBeVisible();
  // Other tests in this file leave live batches of their own in the worker's database, so this test's batches are found by name:
  // the live one is listed with exactly one Revoke Batch button, and the revoked one, which the Live filter drops, is not listed.
  await expect(page.getByRole('button', { name: `Revoke Batch ${liveName}` })).toHaveCount(1);
  await expect(page.getByText(revokedName)).toHaveCount(0);
  await assertNoAccessibilityViolations(page);
});

test('the Card Sign-Ups tab is empty until a card is accepted, downloads as CSV and searches', async ({
  page,
}) => {
  await signInAs(page, 'cards-admin-signups@admin-cards.test', ['discord'], 'admin');
  await page.goto('/keepers/card-sign-ups');
  await expect(page.getByText('No one has accepted a card yet.')).toBeVisible();
  await assertNoAccessibilityViolations(page);

  const csv = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download CSV/ }).click();
  expect((await csv).suggestedFilename()).toBe('card-sign-ups.csv');

  await page.getByRole('searchbox', { name: 'Name, Email or Batch' }).fill('nobody');
  await page.getByRole('searchbox', { name: 'Name, Email or Batch' }).press('Enter');
  await expect(page).toHaveURL(/query=nobody/);
  await expect(page.getByText(/No sign-ups match/)).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

// The phone drawer is a modal sheet, which closes on any Escape its controls leave unclaimed.
test('on a phone, Escape shuts the range calendar and the status list and leaves the Filters sheet open', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAs(page, 'cards-admin-phone@admin-cards.test', ['discord'], 'admin');
  await page.goto('/keepers/invitation-cards');
  await page.getByRole('button', { name: /^Filters/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Filters' });
  await expect(drawer).toBeVisible();

  await drawer.getByRole('button', { name: /^Expires/ }).click();
  const expires = page.getByRole('dialog', { name: 'Choose Expires Days' });
  await expect(expires.getByRole('grid')).toHaveCount(1);
  await assertNoAccessibilityViolations(page);
  await page.keyboard.press('Escape');
  await expect(expires).toBeHidden();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', { name: /^Expires/ })).toBeFocused();

  await drawer.getByRole('combobox', { name: 'Status' }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(drawer).toBeVisible();
});

// Typed with the keyboard alone. Enter commits a box as leaving it does, and must not submit the Filters form round it.
test('an admin types a Minted range into Start and End, and an End before Start is refused until put right', async ({
  page,
}) => {
  await signInAs(page, 'cards-admin-typed@admin-cards.test', ['discord'], 'admin');
  await page.goto('/keepers/invitation-cards');
  await page.getByRole('button', { name: /^Filters/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Filters' });
  await drawer.getByRole('button', { name: /^Minted/ }).click();
  const minted = page.getByRole('dialog', { name: 'Choose Minted Days' });
  const start = minted.getByRole('textbox', { name: 'Start', exact: true });
  const end = minted.getByRole('textbox', { name: 'End', exact: true });
  await expect(start).toHaveAttribute('aria-current', 'true');

  const unfiltered = page.url();
  await start.fill('2026-01-10');
  await start.press('Enter');
  await expect(minted).toBeVisible();
  await expect(drawer).toBeVisible();
  await expect(end).toHaveAttribute('aria-current', 'true');
  await end.fill('2026-01-04');
  await end.press('Tab');
  await expect(end).toHaveAttribute('aria-invalid', 'true');
  await expect(drawer.getByRole('button', { name: /^Minted.*From 10 Jan 2026/ })).toBeVisible();
  await assertNoAccessibilityViolations(page);

  await end.fill('2026-01-31');
  await end.press('Enter');
  await expect(
    drawer.getByRole('button', { name: /^Minted.*10 Jan 2026.*31 Jan 2026/ }),
  ).toBeVisible();
  // A typed End completes the range and leaves the calendar open; neither Enter applied the filters.
  await expect(minted).toBeVisible();
  await expect(drawer).toBeVisible();
  expect(page.url()).toBe(unfiltered);
  await drawer.getByRole('button', { name: 'Apply Filters' }).click();
  await expect(page).toHaveURL(/mintedFrom=2026-01-10&mintedTo=2026-01-31/);
});

test('an admin revokes a whole batch and its links are refused as withdrawn', async ({
  page,
}, testInfo) => {
  await signInAs(page, 'cards-admin-revoke@admin-cards.test', ['discord'], 'admin');
  await page.goto('/keepers/invitation-cards');
  const before = await page.getByRole('button', { name: /^Revoke Batch / }).count();

  await page.getByRole('link', { name: 'Mint Cards' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mint Cards' });
  await dialog.getByRole('spinbutton', { name: 'Number of Sheets' }).fill('1');
  const minted = mintedLinks(page);
  await dialog.getByRole('button', { name: 'Mint Cards' }).click();
  const links = await minted;
  expect(links, 'a sheet of ten links').toHaveLength(10);
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download PDF' }).click();
  const path = testInfo.outputPath('cards.pdf');
  await (await download).saveAs(path);
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /^Revoke Batch / })).toHaveCount(before + 1);

  await page
    .getByRole('button', { name: /^Revoke Batch / })
    .first()
    .click();
  await page
    .getByRole('dialog', { name: 'Revoke Batch' })
    .getByRole('button', { name: 'Revoke Batch' })
    .click();
  await expect(page.getByRole('button', { name: /^Revoke Batch / })).toHaveCount(before);

  await signInAs(page, 'latecomer@admin-cards.test');
  await page.goto(links[0]!);
  await expect(page.getByText(/This card has been withdrawn/)).toBeVisible();
});

test("a beta card's landing page has no violations, and no sideways scroll on a phone", async ({
  page,
  browser,
}) => {
  await signInAs(page, 'cards-admin-beta@admin-cards.test', ['discord'], 'admin');
  await page.goto('/keepers/invitation-cards');
  await page.getByRole('link', { name: 'Mint Cards' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mint Cards' });
  await dialog.getByRole('spinbutton', { name: 'Number of Sheets' }).fill('1');
  await dialog.getByRole('switch', { name: 'Beta Testers' }).check();
  const minted = mintedLinks(page);
  await dialog.getByRole('button', { name: 'Mint Cards' }).click();
  const [link] = await minted;

  // A browser of its own, signed out, as the minted dialog still holds the PDF unsaved here.
  const context = await browser.newContext();
  const visitor = await context.newPage();
  await visitor.goto(link!);
  await expect(visitor.getByRole('heading', { name: 'You’re Among the First' })).toBeVisible();
  await assertNoAccessibilityViolations(visitor);
  await assertNoSidewaysScroll(visitor);
  await assertNoAccessibilityViolations(visitor);
  await context.close();
});
