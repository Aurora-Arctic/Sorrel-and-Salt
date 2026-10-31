import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { latestMessageTo } from '../mailpit';
import { BREACHED_PASSWORD } from '../pwned-range.mjs';
import { withSql } from './coven-ingredients';

// Signing up and in with an email address and a password (claude-docs/auth/passwords.md). The server's
// breached-password checks are answered by tests/e2e/pwned-range-preload.mjs, never the real service.
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const VERIFY_LINK = /https?:\/\/[^\s\])>"]+\/verify-email\?[^\s\])>"]+/;
const PASSWORD = 'lantern moss under the north window';

/** A field in the password form by the start of its label, which ends in the required mark. */
const field = (page: Page, label: string) =>
  page.getByRole('main').getByLabel(new RegExp(`^${label}`));

test(
  'a visitor signs up with an email address and a password, is signed in, and confirms the address by the mailed link',
  { tag: '@story-70' },
  async ({ page }) => {
    const email = `sign-up-${randomUUID()}@password.test`;
    await page.goto('/sign-in?next=%2Fcoven');
    await assertNoAccessibilityViolations(page);

    await page.getByRole('button', { name: 'Create an Account' }).click();
    await expect(page.getByRole('heading', { name: 'Create an Account' })).toBeVisible();
    await field(page, 'Name').fill('Testwort Holder');
    await field(page, 'Email Address').fill(email);

    // A password on the breached list is refused on its field, and no account is made.
    await field(page, 'Password').fill(BREACHED_PASSWORD);
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(field(page, 'Password')).toHaveAttribute('aria-invalid', 'true');
    const none = await withSql((sql) => sql`select 1 from users where email = ${email}`);
    expect(none).toHaveLength(0);

    await field(page, 'Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create Account' }).click();
    // The new account is signed in, and unproved it reaches only the email page, which keeps where it was going.
    await expect(page).toHaveURL('/account/email?next=%2Fcoven');
    await assertNoAccessibilityViolations(page);

    // The account exists, unproved, and earns nothing beyond it.
    const [made] = await withSql(
      (sql) => sql<{ email_verified: boolean; can_create_workspace: boolean }[]>`
        select email_verified, can_create_workspace from users where email = ${email}`,
    );
    expect(made).toEqual({ email_verified: false, can_create_workspace: false });

    // The mailed link, followed from this session, proves the address and goes on.
    const message = await latestMessageTo(email);
    expect(message.to).toEqual([email]);
    const link = new URL(message.text.match(VERIFY_LINK)![0]);
    await page.goto(`${link.pathname}${link.search}`);
    await expect(page).toHaveURL('/account/email?verified&next=%2Fcoven');
    await page.getByRole('link', { name: 'Continue', exact: true }).click();
    await expect(page).toHaveURL('/coven');

    const [proved] = await withSql(
      (sql) => sql<{ email_verified: boolean; can_create_workspace: boolean }[]>`
        select email_verified, can_create_workspace from users where email = ${email}`,
    );
    expect(proved).toEqual({ email_verified: true, can_create_workspace: false });
  },
);

const RESET_LINK = /https?:\/\/[^\s\])>"]+\/reset-password\/[^\s\])>"]+/;
const NEW_PASSWORD = 'heron wading past the salt marsh gate';

test(
  'someone who has forgotten their password asks for a link, follows the mailed link once, chooses a new password, and signs in with it',
  { tag: '@story-71' },
  async ({ page }) => {
    // A verified password account, made through Better Auth's own sign-up so its password is hashed as a
    // real one is; verified, since an unproved address is mailed no reset link.
    const email = `reset-${randomUUID()}@password.test`;
    const made = await page.request.post('/api/auth/sign-up/email', {
      data: { name: 'Testwort Resetter', email, password: PASSWORD },
    });
    expect(made.status(), await made.text()).toBe(200);
    await withSql((sql) => sql`update users set email_verified = true where email = ${email}`);

    await page.goto('/sign-in');
    await page.getByRole('link', { name: 'Forgot Password?' }).click();
    await expect(page).toHaveURL('/forgot-password');
    await assertNoAccessibilityViolations(page);

    await field(page, 'Email Address').fill(email);
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    await expect(page.getByRole('main').getByRole('status')).toContainText(email);

    const message = await latestMessageTo(email, 10_000, 'Reset Your Password');
    expect(message.subject).toBe('Reset Your Password');
    const link = new URL(message.text.match(RESET_LINK)![0]);
    // The mailed link is Better Auth's endpoint, which redirects to the page with the token. Its redirect
    // names the production origin, the fallback for a host it does not know such as an e2e slot's, so the
    // spec reads the redirect and follows its path on this server.
    const followed = await page.request.get(`${link.pathname}${link.search}`, { maxRedirects: 0 });
    const landing = new URL(followed.headers().location!);
    expect(landing.pathname).toBe('/reset-password');
    expect(landing.searchParams.get('token')).toBeTruthy();
    await page.goto(`${landing.pathname}${landing.search}`);
    await expect(field(page, 'New Password')).toBeVisible();
    await assertNoAccessibilityViolations(page);

    await field(page, 'New Password').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Set New Password' }).click();
    await expect(page.getByRole('main').getByRole('status')).toBeVisible();

    // From the notice to sign-in. The old password no longer signs in, and the new one does.
    await page.getByRole('link', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL('/sign-in');
    await field(page, 'Email Address').fill(email);
    await field(page, 'Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toBeVisible();

    await field(page, 'Password').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).not.toHaveURL(/\/sign-in/);

    // The link works once: a second follow is sent to the page with Better Auth's error and no token.
    const again = await page.request.get(`${link.pathname}${link.search}`, { maxRedirects: 0 });
    const spent = new URL(again.headers().location!);
    expect(spent.searchParams.get('error')).toBe('INVALID_TOKEN');
    await page.goto(`${spent.pathname}${spent.search}`);
    await expect(page.getByRole('link', { name: 'Ask for a New Link' })).toBeVisible();
  },
);

test(
  'someone guessing at an account’s password is locked out after five wrong guesses, and the lock looks like a wrong password',
  { tag: '@story-72' },
  async ({ page }) => {
    const email = `lockout-${randomUUID()}@password.test`;
    const made = await page.request.post('/api/auth/sign-up/email', {
      data: { name: 'Testwort Guarded', email, password: PASSWORD },
    });
    expect(made.status(), await made.text()).toBe(200);
    await withSql((sql) => sql`update users set email_verified = true where email = ${email}`);
    // Four wrong guesses already counted, so the browser's next is the fifth; the server allows three sign-in
    // attempts in ten seconds from one client, which four more would pass.
    await withSql(
      (sql) => sql`
        insert into sign_in_failures (user_id, count) select id, 4 from users where email = ${email}`,
    );

    await page.goto('/sign-in');
    await field(page, 'Email Address').fill(email);
    await field(page, 'Password').fill('not the password at all, sadly');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    const alert = page.getByRole('main').getByRole('alert');
    await expect(alert).toBeVisible();
    const wrongPassword = await alert.textContent();

    // Locked: the right password is refused with the same words a wrong one gets.
    await field(page, 'Password').fill(PASSWORD);
    const refused = page.waitForResponse('**/api/auth/sign-in/email');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    expect((await refused).status()).toBe(401);
    await expect(page).toHaveURL('/sign-in');
    await expect(alert).toHaveText(wrongPassword!);

    // The lock is what refused it: with the row gone, the same password signs in.
    await withSql(
      (sql) => sql`
        delete from sign_in_failures where user_id = (select id from users where email = ${email})`,
    );
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).not.toHaveURL(/\/sign-in/);
  },
);
