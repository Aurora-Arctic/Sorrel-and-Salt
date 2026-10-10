import { test, expect } from './fixtures';

// M2.7 against the built server: the proxy's redirect, and what stays public
// (claude-docs/auth/route-protection.md, "Route protection"). `/` is public too; smoke.spec.ts
// renders it signed out.

// A route whose page does not exist yet: the proxy answers before routing does,
// so a missing page cannot be what redirected it.
test('a signed-out visit to a protected route lands on /sign-in, keeping its path', async ({
  page,
}) => {
  await page.goto('/coven/hearth/grimoire?tab=mine');

  const url = new URL(page.url());
  expect(url.pathname).toBe('/sign-in');
  expect(url.searchParams.get('next')).toBe('/coven/hearth/grimoire?tab=mine');
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

// The email page is protected like any other; the proxy answers before the
// page's own requireSession() could.
test('the email page redirects a signed-out visitor to /sign-in, keeping its path', async ({
  page,
}) => {
  await page.goto('/account/email');

  const url = new URL(page.url());
  expect(url.pathname).toBe('/sign-in');
  expect(url.searchParams.get('next')).toBe('/account/email');
});

test('invite acceptance stays reachable signed out', async ({ page }) => {
  const response = await page.goto('/invite/some-token');

  // The page itself, asking for a sign-in, rather than a redirect away (MB.70).
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe('/invite/some-token');
});
