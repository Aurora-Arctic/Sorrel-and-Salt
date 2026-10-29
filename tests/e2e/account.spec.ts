import postgres from 'postgres';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll, settleTransitions } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAs } from './session';

// The account page, signed in: its Name, Email and Sign-In Methods sections. The default server
// configures no provider, so every Add is greyed; linking is asserted in tests/db/account-linking.test.ts
// and a rename in tests/components/NameForm and the set-name service.
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('shows the account’s name, address and one greyed method, jumps to a section, with no accessibility violations', async ({
  page,
}) => {
  await signInAs(page, 'one-method@account-page.test');

  await page.goto('/account');

  const main = page.getByRole('main');
  await expect(main.getByRole('textbox', { name: 'Name' })).toHaveValue('Fixture Person');
  await expect(main.getByRole('textbox', { name: 'Email Address' })).toHaveValue(
    'one-method@account-page.test',
  );
  // No way across to the email page; the nav's Email link stays on this one.
  await expect(main.locator('a[href^="/account/email"]')).toHaveCount(0);
  // The only method's Remove is greyed, not gone, with its reason as its description.
  await expect(main.getByRole('button', { name: /^Remove/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(main.getByRole('button', { name: /^Add/ })).toHaveCount(3);
  await expect(main.getByRole('button', { name: 'Add Microsoft' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );

  // The on-page nav jumps to a section.
  const nav = main.getByRole('navigation', { name: 'On This Page' });
  await nav.getByRole('link', { name: 'Sign-In Methods' }).click();
  await expect(page).toHaveURL(/#account-sign-in-methods$/);
  await expect(main.getByRole('heading', { level: 2, name: 'Sign-In Methods' })).toBeInViewport();

  // Both themes, since a Playwright page is in the light theme unless told otherwise.
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme });
    await settleTransitions(page);
    await assertNoAccessibilityViolations(page);
  }
  await assertNoSidewaysScroll(page);
});

// Two linked, so Remove shows, and a failed link's alert in its provider's
// row: the page's other markup.
test('two linked and a failed link have no accessibility violations', async ({ page }) => {
  await signInAs(page, 'two-methods@account-page.test', ['discord', 'microsoft']);

  await page.goto('/account?error=access_denied&provider=microsoft');

  const main = page.getByRole('main');
  await expect(main.getByRole('button', { name: 'Remove Microsoft' })).toBeVisible();
  // Scoped to <main>: Next portals an empty role="alert" route announcer into <body>.
  await expect(
    main.getByRole('listitem').filter({ hasText: 'Microsoft' }).getByRole('alert'),
  ).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

// A link followed into the shell is a client-side navigation, which once refetched the email page every 80 ms;
// settled means two quiet seconds with no further fetch. A full load never loops, so the account is verified
// while the page draws, then made unverified: the click is then a real router navigation.
async function markUnverified(userId: string): Promise<void> {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    await sql`update users set email_verified = false where id = ${userId}`;
  } finally {
    await sql.end();
  }
}

async function expectSettledOnEmailPage(page: Page, next: string): Promise<void> {
  await expect(page).toHaveURL(`/account/email?next=${next}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Your Email' })).toBeVisible();

  const refetch = page.waitForRequest((request) => request.url().includes('/account/email'), {
    timeout: 2000,
  });
  await expect(refetch).rejects.toThrow();
}

test('settles an unverified account on the email page after a link into the shell', async ({
  page,
}) => {
  const { userId } = await signInAs(page, 'unverified-link@account-page.test', ['discord']);
  await page.goto('/');
  const proceed = page.getByRole('link', { name: 'Continue' });
  await expect(proceed).toBeVisible();

  await markUnverified(userId);
  await proceed.click();
  await expectSettledOnEmailPage(page, '%2Fcoven');
});

// The same by the admin landing, whose own layout under the shell also sends
// an unverified account to the email page.
test('settles an unverified admin on the email page after a link into /admin', async ({ page }) => {
  const { userId } = await signInAs(
    page,
    'unverified-admin-link@account-page.test',
    ['discord'],
    'admin',
  );
  await page.goto('/');
  const proceed = page.getByRole('link', { name: 'Continue' });
  await expect(proceed).toBeVisible();

  await markUnverified(userId);
  await proceed.click();
  await expectSettledOnEmailPage(page, '%2Fadmin');
});
