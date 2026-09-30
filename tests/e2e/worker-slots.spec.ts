import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { E2E_SLOTS, browserUrl, slotPort } from './slots';

// Each worker's reseed, `signInAs` and pages reach its own slot's database and
// server, and no other slot's (claude-docs/testing.md, "E2E").
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test("a worker's session reaches its own slot's server", async ({ page, slot }) => {
  await signInAs(page, 'own-slot@worker-slots.test');

  await page.goto('/account');

  expect(new URL(page.url()).port).toBe(String(slotPort(slot)));
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Sign-in methods' }),
  ).toBeVisible();
});

test("a session signed in on one slot is unknown to another slot's server", async ({
  page,
  slot,
}) => {
  test.skip(E2E_SLOTS < 2, 'a single slot has no other to be unknown to');
  await signInAs(page, 'one-slot@worker-slots.test');

  // Precondition: the session is real, so the refusal below is the other
  // slot's database lacking it rather than a cookie no server would take.
  await page.goto('/account');
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Sign-in methods' }),
  ).toBeVisible();

  const other = (slot + 1) % E2E_SLOTS;
  await page.goto(new URL('/account', browserUrl(slotPort(other))).href);

  const url = new URL(page.url());
  expect(url.port).toBe(String(slotPort(other)));
  expect(url.pathname).toBe('/sign-in');
});
