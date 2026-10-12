import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import postgres from 'postgres';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { slugify } from '@/lib/slugify';

// The coven page and its section nav against the built server (M9.15), and
// the guard that fronts them (claude-docs/auth/coven-guard.md, "The coven
// guard"): a member of any role opens the page, and a signed-in stranger
// meets the same 404 as an address that names no coven at all.
test.describe.configure({ mode: 'serial' });

const COVEN_NAME = 'Fixture Coven';
const COVEN_SLUG = slugify(COVEN_NAME);

type Role = 'owner' | 'member' | 'viewer';
const users: Record<Role | 'stranger', { id: string }> = {
  owner: { id: '' },
  member: { id: '' },
  viewer: { id: '' },
  stranger: { id: '' },
};

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('the fixture coven holds its three members and no one else', async ({ page }) => {
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
});

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
    await expect(main.getByRole('button', { name: 'Leave Workspace', exact: true })).toBeEnabled();
    // Delete is the owner's alone; the membership rows above are why a
    // member's and a viewer's absence is a refusal and not an empty page.
    const remove = main.getByRole('button', { name: 'Delete Workspace', exact: true });
    if (role === 'owner') await expect(remove).toBeEnabled();
    else await expect(remove).toHaveCount(0);
  });
}

test('a signed-in user in no coven gets the same 404 as an unknown slug, with nothing of the coven', async ({
  page,
}) => {
  // The coven exists and admits its owner, so the stranger's 404 is the guard's.
  await signInAgainAs(page, users.owner.id);
  expect((await page.goto(`/coven/${COVEN_SLUG}`))?.status()).toBe(200);

  await signInAgainAs(page, users.stranger.id);
  const refused = await page.goto(`/coven/${COVEN_SLUG}`);
  expect(refused?.status()).toBe(404);
  // The server's own answer carries nothing of the coven, not in the markup
  // and not in the RSC payload: the address is the visitor's, the name is not.
  expect(await refused?.text()).not.toContain(COVEN_NAME);
  await expect(page.getByRole('navigation', { name: 'Coven' })).toHaveCount(0);

  const unknown = await page.goto('/coven/no-such-coven');
  expect(unknown?.status()).toBe(404);
});

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

// The members page (story 9; M6.13): owners and members read the roll, a
// viewer meets the 404 a stranger does, and only an owner has the role
// controls, which promote an existing member through GraphQL.
test.describe('the members page', () => {
  test('an owner and a member read the roll, and a viewer meets the 404', async ({ page }) => {
    for (const role of ['owner', 'member'] as const) {
      await signInAgainAs(page, users[role].id);
      const response = await page.goto(`/coven/${COVEN_SLUG}/members`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('table', { name: 'Members' }).getByRole('row')).toHaveCount(4);
      await expect(
        page
          .getByRole('navigation', { name: 'Coven' })
          .getByRole('link', { name: 'Members', exact: true }),
      ).toHaveAttribute('aria-current', 'page');
    }

    // Why the viewer's 404 is the check's: they hold a live seat, and the
    // coven page opens for them.
    await signInAgainAs(page, users.viewer.id);
    expect((await page.goto(`/coven/${COVEN_SLUG}`))?.status()).toBe(200);
    await expect(
      page.getByRole('navigation', { name: 'Coven' }).getByRole('link', { name: 'Members' }),
    ).toHaveCount(0);
    expect((await page.goto(`/coven/${COVEN_SLUG}/members`))?.status()).toBe(404);
  });

  test('a member has no role controls', async ({ page }) => {
    await signInAgainAs(page, users.member.id);
    await page.goto(`/coven/${COVEN_SLUG}/members`);

    await expect(page.getByRole('table', { name: 'Members' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Change Role/ })).toHaveCount(0);
  });

  test('changing the only owner to a member is refused above the table, naming them', async ({
    page,
  }) => {
    await signInAgainAs(page, users.owner.id);
    await page.goto(`/coven/${COVEN_SLUG}/members`);

    await page
      .getByRole('row')
      .filter({ hasText: 'Owner' })
      .getByRole('button', { name: /^Change Role / })
      .click();
    await page.getByRole('dialog').getByRole('button', { name: 'Demote', exact: true }).click();

    const refusal = page.getByRole('alert').filter({ hasText: 'role was not changed' });
    await expect(refusal).toContainText('This is the last owner');
    // Above the table, not in a row.
    const above = await refusal.evaluate(
      (el) =>
        !!(
          el.compareDocumentPosition(document.querySelector('table') as Node) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
    );
    expect(above).toBe(true);
  });

  test('an owner promotes a member to owner, and the page passes the scans', async ({ page }) => {
    await signInAgainAs(page, users.owner.id);
    await page.goto(`/coven/${COVEN_SLUG}/members`);
    await assertNoAccessibilityViolations(page);
    await assertNoSidewaysScroll(page);

    await page
      .getByRole('row')
      .filter({ hasText: 'Member' })
      .first()
      .getByRole('button', { name: /^Change Role / })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: /^Owner/ }).check();
    await dialog.getByRole('button', { name: 'Promote', exact: true }).click();
    await expect(dialog).toHaveCount(0);

    const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
    try {
      const [seat] = await sql`
        select role::text from workspace_members
        where user_id = ${users.member.id} and deleted_at is null`;
      expect(seat.role).toBe('owner');
    } finally {
      await sql.end();
    }
  });
});
