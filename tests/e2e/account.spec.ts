import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll, settleTransitions } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// The one account page, signed in (MB.71, MB.88): its Name, Email and
// Sign-In Methods sections. The default server configures no provider, so
// every Add is greyed; linking itself is asserted through Better Auth's
// endpoints in tests/db/account-linking.test.ts, and a rename through
// tests/components/NameForm and the set-name service.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('shows all four sections, with no accessibility violations', async ({ page }) => {
  await signInAs(page, 'one-method@account-page.test');

  await page.goto('/account');

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 2 })).toHaveCount(4);
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
  const nav = main.getByRole('navigation', { name: 'On this page' });
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
  await assertNoAccessibilityViolations(page);
  await assertNoSidewaysScroll(page);
});
