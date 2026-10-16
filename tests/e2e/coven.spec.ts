import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import postgres from 'postgres';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { browserUrl, currentSlot, slotPort } from './slots';
import type { Page } from '@playwright/test';
import { slugify } from '@/lib/slugify';

// The coven page and its section nav against the built server (M9.15), and
// the guard that fronts them (claude-docs/auth/coven-guard.md, "The coven
// guard"): a member of any role opens the page, and a signed-in stranger
// meets the same 404 as an address that names no coven at all. Each worker
// builds the coven in its own database before its first test, so the tests
// are independent and spread across workers.

const COVEN_NAME = 'Fixture Coven';
const COVEN_SLUG = slugify(COVEN_NAME);

type Role = 'owner' | 'member' | 'viewer';
const users: Record<Role | 'stranger', { id: string }> = {
  owner: { id: '' },
  member: { id: '' },
  viewer: { id: '' },
  stranger: { id: '' },
};

test.beforeAll(async ({ browser }) => {
  await recreateE2eDatabase();

  // `signInAs` wants a page; only its rows matter here, so the page, and the
  // session it holds, is thrown away. Each test signs in again for itself.
  const setup = await browser.newPage({ baseURL: browserUrl(slotPort(currentSlot())) });
  try {
    await seedFixtureCoven(setup);
  } finally {
    await setup.close();
  }
});

/** The coven holds its three members and no one else: the stranger has no seat. */
async function seedFixtureCoven(page: Page): Promise<void> {
  for (const key of Object.keys(users) as (keyof typeof users)[]) {
    users[key] = { id: (await signInAs(page, `${key}@coven-page.test`)).userId };
  }

  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    const [coven] = await sql`
      insert into workspaces (name, slug, created_by, updated_by)
      values (${COVEN_NAME}, ${COVEN_SLUG}, ${users.owner.id}, ${users.owner.id})
      returning id`;
    for (const role of ['owner', 'member', 'viewer'] as const) {
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${coven.id}, ${users[role].id}, ${role}, ${users.owner.id}, ${users.owner.id})`;
    }
    const members = await sql`
      select user_id, role::text from workspace_members
      where workspace_id = ${coven.id} and deleted_at is null`;
    expect(members.map((row) => [row.user_id, row.role]).sort()).toEqual(
      (['owner', 'member', 'viewer'] as const).map((role) => [users[role].id, role]).sort(),
    );
  } finally {
    await sql.end();
  }
}

for (const role of ['owner', 'member', 'viewer'] as const) {
  test(`a ${role} opens the coven page with its nav, and Leave is offered to every role`, async ({
    page,
  }) => {
    await signInAgainAs(page, users[role].id);

    const response = await page.goto(`/coven/${COVEN_SLUG}`);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: COVEN_NAME })).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Coven' });
    const overview = nav.getByRole('link', { name: 'Overview', exact: true });
    await expect(overview).toHaveAttribute('href', `/coven/${COVEN_SLUG}`);
    await expect(overview).toHaveAttribute('aria-current', 'page');

    const main = page.getByRole('main');
    await expect(main.getByRole('button', { name: 'Leave Coven', exact: true })).toBeEnabled();
    // Delete is the owner's alone; the membership rows above are why a
    // member's and a viewer's absence is a refusal and not an empty page.
    const remove = main.getByRole('button', { name: 'Delete Coven', exact: true });
    if (role === 'owner') await expect(remove).toBeEnabled();
    else await expect(remove).toHaveCount(0);
  });
}

test('real Tab presses reach the Overview link, and the page passes the scans', async ({
  page,
}) => {
  await signInAgainAs(page, users.owner.id);
  await page.goto(`/coven/${COVEN_SLUG}`);

  const overview = page
    .getByRole('navigation', { name: 'Coven' })
    .getByRole('link', { name: 'Overview', exact: true });
  // Bounded: the shell's own stops come first, and a few spare presses
  // tolerate another.
  let reached = false;
  for (let i = 0; i < 10 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await overview.evaluate((element) => element === document.activeElement);
  }
  expect(reached).toBe(true);

  await assertNoAccessibilityViolations(page);
  await assertNoSidewaysScroll(page);
});
