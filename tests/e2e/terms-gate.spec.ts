import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// An account that has not agreed to the terms in force reaches the acceptance page and the public pages and nothing
// else; agreeing returns it to the page it asked for (claude-docs/auth/admin-bootstrap.md, "The terms page").
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('an account that has not agreed is sent to the acceptance page, and returns to the page it asked for', async ({
  page,
}) => {
  await signInAs(page, 'newcomer@terms-gate.test', ['discord'], 'user', { termsAgreed: false });

  await page.goto('/account');
  await expect(page).toHaveURL(/\/account\/terms\?next=%2Faccount$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeVisible();
  await expect(page.getByRole('link', { name: /read the terms of use/i })).toHaveAttribute(
    'href',
    '/terms',
  );
  await assertNoAccessibilityViolations(page);

  await page.getByRole('button', { name: 'Agree & Continue' }).click();
  await expect(page).toHaveURL(/\/account(\/|$)(?!terms)/);
  await expect(page).not.toHaveURL(/\/account\/terms/);

  // Agreed: the acceptance page is no longer the answer for a protected page.
  await page.goto('/account');
  await expect(page).not.toHaveURL(/\/account\/terms/);
});

test('the public pages need no agreement', async ({ page }) => {
  await signInAs(page, 'reader@terms-gate.test', ['discord'], 'user', { termsAgreed: false });

  await page.goto('/terms');
  await expect(page).toHaveURL(/\/terms$/);
  await page.goto('/compendium');
  await expect(page).toHaveURL(/\/compendium$/);
});
