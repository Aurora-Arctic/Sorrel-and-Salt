import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// The one account page, signed in (MB.71, MB.88): its Name, Email and
// Sign-In Methods sections. The default server configures no provider, so
// every Add is greyed; linking itself is asserted through Better Auth's
// endpoints in tests/db/account-linking.test.ts.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('shows all three sections, with no accessibility violations', async ({ page }) => {
  await signInAs(page, 'one-method@account-page.test');

  await page.goto('/account');

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1, name: 'Your Account' })).toBeVisible();
  await expect(main.getByRole('heading', { level: 2 })).toHaveText([
    'Name',
    'Email',
    'Sign-In Methods',
  ]);
  await expect(main.getByRole('textbox', { name: 'Name' })).toHaveValue('Fixture Person');
  await expect(main.getByRole('textbox', { name: 'Email address' })).toHaveValue(
    'one-method@account-page.test',
  );
  await expect(main.getByRole('link', { name: /email/i })).toHaveCount(0);
  await expect(main.getByRole('button', { name: /^Add/ })).toHaveCount(3);
  await expect(main.getByRole('button', { name: 'Add Microsoft' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(main.getByRole('button', { name: /^Remove/ })).toHaveCount(0);
  await assertNoAccessibilityViolations(page);
});

// Two linked, so Remove shows, and a failed link's alert: the page's other markup.
test('two linked and a failed link have no accessibility violations', async ({ page }) => {
  await signInAs(page, 'two-methods@account-page.test', ['discord', 'microsoft']);

  await page.goto('/account?error=access_denied');

  const main = page.getByRole('main');
  await expect(main.getByRole('button', { name: 'Remove Microsoft' })).toBeVisible();
  // Scoped to <main>: Next portals an empty role="alert" route announcer into <body>.
  await expect(main.getByRole('alert')).toHaveText(/cancelled/);
  await assertNoAccessibilityViolations(page);
});

test('renames the account from its Name section', async ({ page }) => {
  await signInAs(page, 'renamed@account-page.test');
  await page.goto('/account');

  const name = page.getByRole('region', { name: 'Name' });
  await expect(name.getByRole('button', { name: 'Save Name' })).toBeDisabled();
  await name.getByRole('textbox', { name: 'Name' }).fill('Fixture Renamed');
  await name.getByRole('button', { name: 'Save Name' }).click();

  await expect(name.getByRole('status')).toHaveText('Saved your name.');
  await assertNoAccessibilityViolations(page);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Fixture Renamed');
});

test('sends an unverified account to the email page instead', async ({ page }) => {
  await signInAs(page, 'unverified@account-page.test', ['discord'], 'user', {
    emailVerified: false,
  });

  // The redirect is read rather than followed: the session rides as an extra
  // request header (tests/e2e/session.ts), which the browser does not carry
  // onto a redirect it follows, so the followed request would arrive signed out.
  const redirected = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/account',
  );
  await page.goto('/account').catch(() => {});
  const response = await redirected;
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe('/account/email?next=%2Faccount');

  await page.goto('/account/email?next=%2Faccount');
  await expect(page.getByRole('heading', { level: 1, name: 'Your Email' })).toBeVisible();
});
