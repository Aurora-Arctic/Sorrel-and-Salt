import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { totpCode } from '../../support/two-factor';
import { agreedInForceSql } from '../../support/db/agreement-in-force';
import { PASSWORD, field } from '../session';
import { withSql } from './accounts-setup';
import { PHONE_WIDTH } from '../breakpoints';

// Two-factor for password sign-ins (claude-docs/auth/two-factor.md). The code is computed from the key the account
// page shows, as an authenticator app computes it from the QR code.
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

async function signInWithPassword(page: Page, email: string) {
  await page.goto('/sign-in?method=email');
  const main = page.getByRole('main');
  await field(main, 'Email Address').fill(email);
  await field(main, 'Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
}

test(
  'someone with a password turns on two-factor from the account page, then signs in with the password and a code from the app',
  { tag: '@story-75' },
  async ({ page }) => {
    // A verified password account, made through Better Auth's own sign-up so its password is hashed as a real one is.
    const email = `two-factor-${randomUUID()}@password.test`;
    const made = await page.request.post('/api/auth/sign-up/email', {
      data: { name: 'Testwort Doubled', email, password: PASSWORD },
    });
    expect(made.status(), await made.text()).toBe(200);
    await withSql(
      (sql) =>
        sql`update users set email_verified = true,
          (agreed_terms_version, agreed_disclaimer_version, agreed_ethics_version) = (${agreedInForceSql(sql)}),
          terms_accepted_at = now() where email = ${email}`,
    );

    // Sign-up leaves a session cookie; the story starts signed out.
    await page.context().clearCookies();
    await signInWithPassword(page, email);
    await expect(page).not.toHaveURL(/\/sign-in/);

    await page.goto('/account/sign-in');
    const section = page.getByRole('region', { name: 'Two-Factor Sign-In' });
    await field(section, 'Confirm Your Password').fill(PASSWORD);
    await section.getByRole('button', { name: 'Turn On Two-Factor' }).click();

    await expect(section.getByRole('img', { name: /QR code/ })).toBeVisible();
    await expect(
      section.getByRole('list', { name: 'Backup Codes' }).getByRole('listitem'),
    ).not.toHaveCount(0);
    // Sweep gap: the account page showing the two-factor QR code and its backup codes.
    await assertNoAccessibilityViolations(page);
    const [before] = await withSql(
      (sql) => sql<{ two_factor_enabled: boolean }[]>`
        select two_factor_enabled from users where email = ${email}`,
    );
    expect(before.two_factor_enabled).toBe(false);

    const key = await section.locator('code.two-factor__key').textContent();
    // The shown key is grouped for reading; the authenticator URI wants the bare base32.
    const appUri = `otpauth://totp/e2e?secret=${(key ?? '').replace(/[^A-Z2-7]/gi, '')}`;
    await field(section, 'Code From Your App').fill(await totpCode(appUri));
    await section.getByRole('button', { name: 'Confirm and Turn On' }).click();
    await page
      .getByRole('dialog', { name: 'Turn On Without Saving Your Codes?' })
      .getByRole('button', { name: 'Turn On' })
      .click();
    await expect(section.getByRole('button', { name: 'Turn Off Two-Factor' })).toBeVisible();

    const [after] = await withSql(
      (sql) => sql<{ two_factor_enabled: boolean }[]>`
        select two_factor_enabled from users where email = ${email}`,
    );
    expect(after.two_factor_enabled).toBe(true);

    // Signed out, the right password alone no longer signs in: the page asks for the code.
    await page.context().clearCookies();
    await signInWithPassword(page, email);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Enter Your Code' })).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
    // Sweep gap: the sign-in page asking for a two-factor code after the password.
    await assertNoAccessibilityViolations(page);

    await page.setViewportSize({ width: PHONE_WIDTH, height: 844 });
    const verifyBox = await main.getByRole('button', { name: 'Verify' }).boundingBox();
    expect(verifyBox).not.toBeNull();
    expect(verifyBox!.x).toBeGreaterThanOrEqual(0);
    expect(verifyBox!.x + verifyBox!.width).toBeLessThanOrEqual(PHONE_WIDTH);

    await field(main, 'Code From Your App').fill(await totpCode(appUri));
    await main.getByRole('button', { name: 'Verify' }).click();
    await expect(page).not.toHaveURL(/\/sign-in/);

    await page.goto('/account/sign-in');
    await expect(page).toHaveURL('/account/sign-in');
  },
);
