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

    await page.getByRole('button', { name: 'Continue with Email' }).click();
    await expect(page).toHaveURL(/method=email/);
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
