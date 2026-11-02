import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { withSql } from './stories/coven-ingredients';
import { makeIngredient } from '../support/fixtures/ingredient';
import { insertIngredient } from '../support/db/insert-ingredient';
import { ingredientSlug } from '@/lib/slugify';

// An admin pauses a user's access from the People page's user modal; the user still signs in, by password through the
// sign-in page, into support and nothing else, told on every page they reach that they are paused, and once the admin lifts
// the pause the rest of the site opens (claude-docs/auth/admin-bootstrap.md, "Pausing a user's access").

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

test('an admin pauses a user’s access, the user signs in to support alone, and once lifted reaches the rest', async ({
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

  const { userId: adminId } = await signInAs(
    page,
    `admin-${randomUUID()}@access-pause.test`,
    ['discord'],
    'admin',
  );
  const entry = makeIngredient({ name: 'Testwort Pausewort', nomenclature: 'none' });
  await withSql((sql) => insertIngredient(sql, entry, adminId));
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

  // The right password signs in, and the landing sends the user on to the paused page, which names no end.
  await signInByPassword(userPage, email);
  await expect(userPage).toHaveURL('/access-paused');
  await expect(userPage.getByRole('heading', { name: 'Access Paused', level: 1 })).toBeVisible();
  await assertNoAccessibilityViolations(userPage);
  expect(await sessionsOf(userId)).toHaveLength(1);

  // The page's Support link opens the Support dialog over it, as the footer's does, and the request sends signed in.
  await userPage.getByRole('main').getByRole('link', { name: 'Support', exact: true }).click();
  await expect(userPage).toHaveURL('/access-paused?support=');
  const dialog = userPage.getByRole('dialog');
  await dialog.getByRole('radio', { name: /^Account & Sign-In/ }).check();
  await dialog.getByLabel(/^Subject/).fill('Why is my access paused?');
  await dialog.getByLabel(/^Message/).fill('I cannot open my coven.');
  await dialog.getByRole('button', { name: 'Send Request', exact: true }).click();
  await expect(dialog.getByRole('status').filter({ hasText: 'was received' })).toBeVisible();
  const sent = await withSql(
    (sql) => sql`select 1 from support_requests where created_by = ${userId}`,
  );
  expect(sent).toHaveLength(1);

  // The support page opens signed in, under the notice that access is paused.
  await userPage.goto('/support');
  const notice = userPage.getByRole('complementary', { name: 'Site Access' });
  await expect(notice).toContainText('Your site access is paused, with no end date.');
  await expect(notice.getByRole('link', { name: 'What This Means' })).toHaveAttribute(
    'href',
    '/access-paused',
  );
  await assertNoAccessibilityViolations(userPage);

  // The compendium reads as signed out beneath the notice; a coven or account page sends the user to the paused page.
  await userPage.goto('/compendium');
  await expect(userPage.getByRole('complementary', { name: 'Site Access' })).toBeVisible();
  // An entry draws the notice in its own text column, and the shell draws none beside it.
  await userPage.goto(`/compendium/ingredients/${ingredientSlug(entry.name, entry.canonicalName)}`);
  await expect(userPage.getByRole('complementary', { name: 'Site Access' })).toHaveCount(1);
  await expect(
    userPage.getByRole('main').getByRole('complementary', { name: 'Site Access' }),
  ).toBeVisible();
  for (const path of ['/coven', '/account']) {
    await userPage.goto(path);
    await expect(userPage).toHaveURL('/access-paused');
  }

  // Timed out from support as well, the paused page, which has no account menu, still links to the user's own requests:
  // the request reads there, and the time-out refuses a reply.
  await withSql(
    (sql) => sql`
      insert into support_timeouts (user_id, until, note, created_by, updated_by)
      values (${userId}, null, 'Spam', ${adminId}, ${adminId})`,
  );
  await userPage.goto('/access-paused');
  await expect(userPage.getByRole('main')).toContainText('you are timed out with no end date');
  await userPage.getByRole('main').getByRole('link', { name: 'your requests' }).click();
  await expect(userPage).toHaveURL('/account/support');
  await userPage.getByRole('link', { name: 'Why is my access paused?' }).click();
  const thread = userPage.getByRole('dialog', { name: 'Why is my access paused?' });
  await expect(thread.getByText('I cannot open my coven.')).toBeVisible();
  await expect(thread.getByLabel(/^Your Reply/)).toBeDisabled();
  await assertNoAccessibilityViolations(userPage);

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

  // The same session now reaches the account page, without the notice.
  await userPage.goto('/account');
  await expect(userPage).toHaveURL(/\/account/);
  await expect(userPage.getByRole('complementary', { name: 'Site Access' })).toHaveCount(0);
  // With no pause standing, the paused page sends the session on.
  await userPage.goto('/access-paused');
  await expect(userPage).not.toHaveURL(/\/access-paused/);

  await user.close();
});
