import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { type Coven, seedCoven, withSql } from './stories/coven-ingredients';

// For what story 96 does not walk: a path beneath an old address, a non-member at one, another coven taking one, and a
// second rename dropping the first address.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

// `seedCoven` writes the coven's first address; a coven renamed once holds that one and its new one.
async function renameByHand(coven: Coven, name: string, slug: string): Promise<void> {
  await withSql(async (sql) => {
    await sql`
      insert into workspace_slugs (workspace_id, slug, created_by, updated_by)
      values (${coven.id}, ${slug}, ${coven.users.A}, ${coven.users.A})`;
    await sql`update workspaces set name = ${name}, slug = ${slug} where id = ${coven.id}`;
  });
}

test('a member at an old address, or a path beneath it, lands on the same path at the current address', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Rename Before', 'rename-member.test', {
    A: 'owner',
    C: 'viewer',
  });
  const old = coven.slug;
  await renameByHand(coven, 'Fixture Rename After', 'fixture-rename-after');

  // Why the redirect could be absent: the old address is not the coven's current one.
  const [row] = await withSql(
    (sql) => sql<{ slug: string }[]>`select slug from workspaces where id = ${coven.id}`,
  );
  expect(row?.slug).toBe('fixture-rename-after');
  expect(old).not.toBe('fixture-rename-after');

  await signInAgainAs(page, coven.users.C);

  await page.goto(`/coven/${old}`);
  await expect(page).toHaveURL(/\/coven\/fixture-rename-after$/);

  const beneath = await page.goto(`/coven/${old}/ingredients`);
  expect(beneath?.status()).toBe(200);
  await expect(page).toHaveURL(/\/coven\/fixture-rename-after\/ingredients$/);
});

test('a non-member at an old address is told the page does not exist', async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Rename Gate', 'rename-gate.test', { A: 'owner' });
  const theirs = await seedCoven(page, 'Fixture Rename Theirs', 'rename-theirs.test', {
    D: 'owner',
  });
  const old = coven.slug;
  await renameByHand(coven, 'Fixture Rename Gate After', 'fixture-rename-gate-after');

  // Why the page could have been served: D is signed in and reads a coven of D's own, and A
  // reaches this coven at its old address.
  await signInAgainAs(page, coven.users.A);
  await page.goto(`/coven/${old}`);
  await expect(page).toHaveURL(/\/coven\/fixture-rename-gate-after$/);
  await signInAgainAs(page, theirs.users.D);
  const own = await page.goto(`/coven/${theirs.slug}`);
  expect(own?.status()).toBe(200);

  const refused = await page.goto(`/coven/${old}`);
  expect(refused?.status()).toBe(404);
  await expect(page).toHaveURL(new RegExp(`/coven/${old}$`));

  const current = await page.goto('/coven/fixture-rename-gate-after');
  expect(current?.status()).toBe(404);
});

// Renames through the coven page, so the service picks the address and the writer retires what it must.
async function renameInPage(page: Page, slug: string, name: string): Promise<void> {
  await page.goto(`/coven/${slug}`);
  await page.getByRole('textbox', { name: 'Name' }).fill(name);
  await page.getByRole('button', { name: /^Save/ }).click();
}

test("once another coven takes an old address, the old coven's member there is told the page does not exist", async ({
  page,
}) => {
  const moved = await seedCoven(page, 'Fixture Rename Left', 'rename-left.test', {
    A: 'owner',
    C: 'viewer',
  });
  const claimer = await seedCoven(page, 'Fixture Rename Arriving', 'rename-arriving.test', {
    D: 'owner',
  });
  const old = moved.slug;
  await signInAgainAs(page, moved.users.A);
  await renameInPage(page, old, 'Fixture Rename Left Behind');
  await expect(page).toHaveURL(/\/coven\/fixture-rename-left-behind$/);

  // Why the page could have been served: before the claim, the old address takes C to the moved coven.
  await signInAgainAs(page, moved.users.C);
  await page.goto(`/coven/${old}`);
  await expect(page).toHaveURL(/\/coven\/fixture-rename-left-behind$/);

  await signInAgainAs(page, claimer.users.D);
  await renameInPage(page, claimer.slug, 'Fixture Rename Left');
  await expect(page).toHaveURL(new RegExp(`/coven/${old}$`));
  const taken = await page.goto(`/coven/${old}`);
  expect(taken?.status()).toBe(200);
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Fixture Rename Left');

  await signInAgainAs(page, moved.users.C);
  const refused = await page.goto(`/coven/${old}`);
  expect(refused?.status()).toBe(404);
  await expect(page).toHaveURL(new RegExp(`/coven/${old}$`));
});

test('after a second rename, the first address is told not to exist and the second still redirects', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Rename First', 'rename-twice.test', { A: 'owner' });
  const first = coven.slug;
  await signInAgainAs(page, coven.users.A);
  await renameInPage(page, first, 'Fixture Rename Second');
  await expect(page).toHaveURL(/\/coven\/fixture-rename-second$/);

  // Why the first address could still lead somewhere: after one rename it redirects.
  await page.goto(`/coven/${first}`);
  await expect(page).toHaveURL(/\/coven\/fixture-rename-second$/);

  await renameInPage(page, 'fixture-rename-second', 'Fixture Rename Third');
  await expect(page).toHaveURL(/\/coven\/fixture-rename-third$/);

  const dropped = await page.goto(`/coven/${first}`);
  expect(dropped?.status()).toBe(404);
  await page.goto('/coven/fixture-rename-second');
  await expect(page).toHaveURL(/\/coven\/fixture-rename-third$/);
});
