import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { withSql } from './stories/coven-ingredients';

// An admin pauses a user's access from the People page's user modal, the user's sign-in is refused onto the paused
// page, and once the admin lifts the pause the same sign-in succeeds (claude-docs/auth/admin-bootstrap.md, "Pausing a
// user's access"). The user signs in by password through the sign-in page, so the refusal is the sign-in hook's.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const PASSWORD = 'lantern moss under the north window';

/** A field in the password form by the start of its label, which ends in the required mark. */
const field = (page: Page, label: string) =>
  page.getByRole('main').getByLabel(new RegExp(`^${label}`));

async function signInByPassword(page: Page, email: string): Promise<void> {
  await page.goto('/sign-in?method=email');
  await field(page, 'Email Address').fill(email);
  await field(page, 'Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
}

const sessionsOf = (userId: string) =>
  withSql((sql) => sql`select 1 from sessions where user_id = ${userId}`);

test('an admin pauses a user’s access, the user’s sign-in is refused, and once lifted it succeeds', async ({
  page,
  browser,
}) => {
  // A verified password account, made through Better Auth's own sign-up so its password is hashed as a real one is.
  const user = await browser.newContext();
  const userPage = await user.newPage();
  const email = `paused-${randomUUID()}@access-pause.test`;
  const made = await userPage.request.post('/api/auth/sign-up/email', {
    data: { name: 'Testwort Paused', email, password: PASSWORD },
  });
  expect(made.status(), await made.text()).toBe(200);
  const [row] = await withSql(
    (sql) =>
      sql<
        { id: string }[]
      >`update users set email_verified = true where email = ${email} returning id`,
  );
  const userId = row!.id;
  // Sign-up leaves a session; the user starts signed out in the browser, and the pause deletes the row.
  await user.clearCookies();
  expect(await sessionsOf(userId)).toHaveLength(1);

  await signInAs(page, `admin-${randomUUID()}@access-pause.test`, ['discord'], 'admin');
  await page.goto(`/admin/users?user=${userId}`);
  const modal = page.getByRole('dialog');
  const access = modal.getByRole('region', { name: 'Site Access' });
  await access.getByRole('button', { name: 'Site Access', expanded: false }).click();

  // An open-ended pause with a note, asked before it is sent.
  await access.getByRole('combobox', { name: 'For' }).selectOption({ label: 'No End Date' });
  await access.getByRole('textbox', { name: 'Note' }).fill('Shared password');
  await access.getByRole('button', { name: 'Pause Access', exact: true }).click();
  const confirmPause = page.getByRole('button', { name: 'Pause', exact: true });
  await expect(confirmPause).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await confirmPause.click();
  await expect(access.getByRole('button', { name: 'Lift Pause', exact: true })).toBeVisible();
  const [standing] = await withSql(
    (sql) => sql<{ until: Date | null; note: string | null; lifted_at: Date | null }[]>`
      select until, note, lifted_at from user_access_pauses where user_id = ${userId}`,
  );
  expect(standing).toEqual({ until: null, note: 'Shared password', lifted_at: null });
  // Pausing signs the user out everywhere.
  expect(await sessionsOf(userId)).toHaveLength(0);

  // The right password is refused onto the paused page, which names no end, and no session is made.
  await signInByPassword(userPage, email);
  await expect(userPage).toHaveURL('/access-paused');
  await expect(userPage.getByRole('heading', { name: 'Access Paused', level: 1 })).toBeVisible();
  await assertNoAccessibilityViolations(userPage);
  expect(await sessionsOf(userId)).toHaveLength(0);

  // Lifted, the pause moves to the earlier list, and the form is offered again.
  await access.getByRole('button', { name: 'Lift Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Lift', exact: true }).click();
  await expect(access.getByRole('button', { name: 'Pause Access', exact: true })).toBeVisible();
  await expect(
    access.getByRole('list', { name: 'Earlier Pauses' }).getByRole('listitem'),
  ).toHaveCount(1);
  const [lifted] = await withSql(
    (sql) => sql<{ lifted: boolean }[]>`
      select lifted_at is not null and lifted_by is not null as lifted from user_access_pauses where user_id = ${userId}`,
  );
  expect(lifted).toEqual({ lifted: true });

  // The same sign-in now succeeds, leaving the sign-in page with a session.
  await signInByPassword(userPage, email);
  await expect(userPage).not.toHaveURL(/\/(sign-in|access-paused)/);
  expect(await sessionsOf(userId)).toHaveLength(1);

  await user.close();
});
