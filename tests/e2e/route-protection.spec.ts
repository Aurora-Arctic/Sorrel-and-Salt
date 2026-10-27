import postgres from 'postgres';
import { test, expect } from './fixtures';
import { e2eDatabaseUrl } from './database';
import { signInAs } from './session';

// M2.7 against the built server: the proxy's redirect (claude-docs/auth/route-protection.md,
// "Route protection"). What stays public is proved elsewhere: `/` rendered
// signed out by smoke.spec.ts, and `/invite/[token]` left open by
// tests/proxy.test.ts and rendered by the invitation stories in
// stories/01-invitations.spec.ts.

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

// The second layer, by client-side navigation: a cookie the proxy still lets
// through, for a session revoked since the page loaded, is sent to sign in
// by the shell layout as a link into it is followed (MB.256).
test('a revoked session following a link into the shell lands on /sign-in', async ({ page }) => {
  const { userId } = await signInAs(page, 'revoked-link@route-protection.test');
  await page.goto('/');
  // Signed in when the page drew, so the link is the landing's, not sign-in's.
  const proceed = page.getByRole('link', { name: 'Continue' });
  await expect(proceed).toBeVisible();

  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    await sql`delete from sessions where user_id = ${userId}`;
  } finally {
    await sql.end();
  }
  await proceed.click();

  await expect(page).toHaveURL('/sign-in?next=%2Fcoven');
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});
