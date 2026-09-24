import { test, expect } from './fixtures';

// M2.7 against the built server: the proxy's redirect, and what stays public
// (claude-docs/auth.md, "Route protection"). `/` is public too; smoke.spec.ts
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

test('invite acceptance stays reachable signed out', async ({ page }) => {
  const response = await page.goto('/invite/some-token');

  // No page there yet, so a 404 — from the route itself, not a redirect away.
  expect(response?.status()).toBe(404);
  expect(new URL(page.url()).pathname).toBe('/invite/some-token');
});
