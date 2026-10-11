import { test, expect } from './fixtures';

// M2.7 against the built server: the proxy's redirect (claude-docs/auth/route-protection.md,
// "Route protection"). What stays public is rendered signed out elsewhere: `/`
// by smoke.spec.ts, `/invite/[token]` by invite.spec.ts.

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
