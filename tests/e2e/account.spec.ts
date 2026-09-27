import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// The account page, signed in (MB.71). The default server configures no
// provider, so every Add is greyed; linking itself is asserted through
// Better Auth's endpoints in tests/db/account-linking.test.ts.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('lists the sign-in methods, with no accessibility violations', async ({ page }) => {
  await signInAs(page, 'one-method@account-page.test');

  await page.goto('/account');

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Sign-in methods' })).toBeVisible();
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
