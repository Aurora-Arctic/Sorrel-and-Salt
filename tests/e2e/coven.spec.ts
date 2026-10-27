import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import postgres from 'postgres';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { slotUrl } from './slots';
import type { Page } from '@playwright/test';
import { slugify } from '@/lib/slugify';

// The coven page and its section nav against the built server (M9.15): a
// viewer opens the page with Leave and without Delete, the keyboard reaches
// the nav, and the only owner's exit keeps its refusal inside the dialog.
// Story 9 opens the page as an owner and a member (stories/01-members.spec.ts),
// and a stranger's 404 (claude-docs/auth/coven-guard.md, "The coven guard") is
// coven-ingredients.spec.ts's and stories 9 and 17's. Each worker builds the
// coven in its own database before its first test, so the tests are
// independent and spread across workers.

const COVEN_NAME = 'Fixture Coven';
const COVEN_SLUG = slugify(COVEN_NAME);

type Role = 'owner' | 'viewer';
const users: Record<Role, { id: string }> = {
  owner: { id: '' },
  viewer: { id: '' },
};

test.beforeAll(async ({ browser, slot }) => {
  await recreateE2eDatabase();

  // `signInAs` wants a page; only its rows matter here, so the page, and the
  // session it holds, is thrown away. Each test signs in again for itself.
  const setup = await browser.newPage({ baseURL: slotUrl(slot) });
  try {
    await seedFixtureCoven(setup);
  } finally {
    await setup.close();
  }
});

/** The coven holds its owner and its viewer and no one else. */
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
    for (const role of ['owner', 'viewer'] as const) {
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${coven.id}, ${users[role].id}, ${role}, ${users.owner.id}, ${users.owner.id})`;
    }
    const members = await sql`
      select user_id, role::text from workspace_members
      where workspace_id = ${coven.id} and deleted_at is null`;
    expect(members.map((row) => [row.user_id, row.role]).sort()).toEqual(
      (['owner', 'viewer'] as const).map((role) => [users[role].id, role]).sort(),
    );
  } finally {
    await sql.end();
  }
}

test('a viewer opens the coven page with its nav, offered Leave and not Delete', async ({
  page,
}) => {
  await signInAgainAs(page, users.viewer.id);

  const response = await page.goto(`/coven/${COVEN_SLUG}`);

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: COVEN_NAME })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Coven' });
  const overview = nav.getByRole('link', { name: 'Overview', exact: true });
  await expect(overview).toHaveAttribute('href', `/coven/${COVEN_SLUG}`);
  await expect(overview).toHaveAttribute('aria-current', 'page');

  const main = page.getByRole('main');
  await expect(main.getByRole('button', { name: 'Leave Coven', exact: true })).toBeEnabled();
  // Delete is the owner's alone; the membership row above is why the
  // viewer's absence of it is a refusal and not an empty page.
  await expect(main.getByRole('button', { name: 'Delete Coven', exact: true })).toHaveCount(0);
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

// A refusal said inside the only owner's exit dialog, at a phone's width,
// where the notice once pushed Cancel past the dialog's edge (M12.31). The
// page offers this owner the exit dialog because the fixture's owner is its
// only one.
test("a refused deletion in the only owner's exit keeps Cancel inside the dialog at 375px", async ({
  page,
}) => {
  await signInAgainAs(page, users.owner.id);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/coven/${COVEN_SLUG}`);
  await page.getByRole('main').getByRole('button', { name: 'Leave Coven', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: /^Delete It/ }).check();
  const remove = dialog.getByRole('button', { name: 'Delete Coven', exact: true });
  const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });

  // The service's refusal, answered in its place, so nothing is deleted.
  const refusal = 'This coven could not be deleted.';
  await page.route('**/api/graphql', (route) =>
    route.request().postData()?.includes('DeleteWorkspace')
      ? route.fulfill({ json: { data: null, errors: [{ message: refusal }] } })
      : route.continue(),
  );
  await remove.click();
  const confirmation = page.getByRole('group', { name: /^Delete Fixture Coven/ });
  await confirmation.getByRole('button', { name: 'Delete Coven', exact: true }).click();

  const notice = dialog.getByRole('alert');
  await expect(notice).toHaveText(refusal);
  const box = (await cancel.boundingBox())!;
  const frame = (await dialog.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width);
  await assertNoSidewaysScroll(page);
  await assertNoAccessibilityViolations(page);
  await page.unrouteAll();
});
