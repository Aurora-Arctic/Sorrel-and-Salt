import postgres from 'postgres';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from '../database';
import { signInAs } from '../session';

// The privilege ledger page (MB.200; claude-docs/auth/admin-users.md, "The
// privilege ledger") against the built server: a non-admin's 403, an
// approval made on /admin/users read back newest first, the name-or-email
// search and the privilege dropdown narrowing it, and each user row's
// permissions history icon opening it searched for that user's address. Axe in both
// themes.
test.describe.configure({ mode: 'serial' });

const SUBJECT_EMAIL = 'subject@privilege-ledger.test';
const SUBJECT_NAME = 'Ledger Fixturewort';

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** Makes the account the ledger is about, named apart from the admins who act on it. */
async function makeSubject(page: Parameters<typeof signInAs>[0]): Promise<void> {
  const { userId } = await signInAs(page, SUBJECT_EMAIL);
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    // The name is no privilege, so the trigger on `users` asks no route.
    await sql`update users set name = ${SUBJECT_NAME} where id = ${userId}`;
  } finally {
    await sql.end();
  }
}

test('a signed-in non-admin is refused at /admin/privilege-changes with the 403 page', async ({
  page,
}) => {
  await signInAs(page, 'not-an-admin@privilege-ledger.test');

  const response = await page.goto('/admin/privilege-changes');

  expect(response?.status()).toBe(403);
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1, name: 'Not Authorized' }),
  ).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
});

test('an admin reads an approval back from the ledger, then narrows it', async ({ page }) => {
  await makeSubject(page);
  await signInAs(page, 'approving-admin@privilege-ledger.test', ['discord'], 'admin');

  // The change the ledger is to show, made where an admin makes it.
  await page.goto(`/admin/users?query=${encodeURIComponent(SUBJECT_EMAIL)}`);
  await page.getByRole('button', { name: `Approve ${SUBJECT_NAME}` }).click();
  const approving = page.getByRole('dialog', { name: 'Approve Coven Creation' });
  await approving.getByRole('button', { name: 'Approve' }).click();
  await expect(approving).toHaveCount(0);

  // From the admin nav, after Users.
  await page
    .getByRole('navigation', { name: 'Admin' })
    .getByRole('link', {
      name: 'Privilege Changes',
    })
    .click();
  await expect(page).toHaveURL(/\/admin\/privilege-changes$/);
  await expect(page).toHaveTitle('Privilege Changes — Admin — Sorrel & Salt');
  await expect(page.getByRole('heading', { level: 1, name: 'Privilege Changes' })).toBeVisible();

  // Newest first: the approval heads the ledger, by the admin who made it.
  const first = page.getByRole('row').nth(1);
  await expect(first.getByRole('cell').nth(1)).toHaveText(SUBJECT_NAME);
  await expect(first.getByRole('cell').nth(2)).toHaveText('Coven creation');
  await expect(first.getByRole('cell').nth(3)).toHaveText('Granted');
  await expect(first.getByRole('cell').nth(4)).toHaveText('By an admin');
  await expect(first.getByRole('cell').nth(5)).toHaveText('Fixture Person');
  await expect(first.getByRole('link', { name: SUBJECT_NAME })).toHaveAttribute(
    'href',
    `/admin/users?query=${encodeURIComponent(SUBJECT_EMAIL)}`,
  );
  // More than this one change: the seed's and the signed-in admin's own.
  expect(await page.getByRole('row').count()).toBeGreaterThan(2);

  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme });
    await assertNoAccessibilityViolations(page);
  }

  // The search, by part of an address, then the privilege dropdown.
  const filter = page.getByRole('form', { name: 'Filter privilege changes' });
  await filter.getByLabel('Name or Email').fill('SUBJECT@privilege');
  await filter.getByLabel('Privilege').selectOption('create_workspace');
  await filter.getByRole('button', { name: 'Filter' }).click();
  await expect(page).toHaveURL(
    /\/admin\/privilege-changes\?query=SUBJECT%40privilege&privilege=create_workspace$/,
  );
  await expect(page.getByRole('row')).toHaveCount(2);
  await expect(page.getByRole('row').nth(1).getByRole('cell').nth(1)).toHaveText(SUBJECT_NAME);

  await filter.getByLabel('Privilege').selectOption('admin');
  await filter.getByRole('button', { name: 'Filter' }).click();
  await expect(page).toHaveURL(/privilege=admin$/);
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByText('No admin changes for “SUBJECT@privilege”.')).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

test("a user row's permissions history icon opens the ledger searched for that user", async ({
  page,
}) => {
  await signInAs(page, 'reading-admin@privilege-ledger.test', ['discord'], 'admin');

  await page.goto(`/admin/users?query=${encodeURIComponent(SUBJECT_EMAIL)}`);
  const row = page.getByRole('row', { name: new RegExp(SUBJECT_NAME) });
  const icon = row.getByRole('link', { name: `Permissions history for ${SUBJECT_NAME}` });
  await icon.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Permissions History');
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme });
    await assertNoAccessibilityViolations(page);
  }

  await icon.click();
  await expect(page).toHaveURL(
    /\/admin\/privilege-changes\?query=subject%40privilege-ledger\.test$/,
  );
  await expect(
    page.getByRole('form', { name: 'Filter privilege changes' }).getByLabel('Name or Email'),
  ).toHaveValue(SUBJECT_EMAIL);
  const rows = page.getByRole('row');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(1).getByRole('cell').nth(1)).toHaveText(SUBJECT_NAME);
  await assertNoAccessibilityViolations(page);
});
