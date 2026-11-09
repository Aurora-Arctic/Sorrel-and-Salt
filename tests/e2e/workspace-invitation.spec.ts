import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { latestMessageTo } from './mailpit';
import { signInAgainAs, signInAs } from './session';
import { slotUrl } from './slots';
import type { Page } from '@playwright/test';

const COVEN_NAME = 'Fixture Invite Coven';
const DOMAIN = '@workspace-invitation.test';
const run = randomUUID().slice(0, 8);
const COVEN_SLUG = `fixture-invite-coven-${run}`;
const address = (local: string) => `${local}-${run}${DOMAIN}`;

let ownerId = '';
let covenId = '';

async function withSql<T>(work: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    return await work(sql);
  } finally {
    await sql.end();
  }
}

test.beforeAll(async ({ browser, slot }) => {
  await recreateE2eDatabase();

  // Only the rows matter: the page and its session are thrown away.
  const setup = await browser.newPage({ baseURL: slotUrl(slot) });
  try {
    ownerId = (await signInAs(setup, address('owner'))).userId;
  } finally {
    await setup.close();
  }
  await withSql(async (sql) => {
    const [coven] = await sql`
      insert into workspaces (name, slug, created_by, updated_by)
      values (${COVEN_NAME}, ${COVEN_SLUG}, ${ownerId}, ${ownerId}) returning id`;
    covenId = coven.id as string;
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${covenId}, ${ownerId}, 'owner', ${ownerId}, ${ownerId})`;
  });
});

/** The invitation's path from the mailed link: the build's origin is its fallback, not this server. */
async function mailedInvitePath(to: string): Promise<string> {
  const message = await latestMessageTo(to);
  const link = message.text.match(/https?:\/\/\S+\/invite\/[A-Za-z0-9_-]+/)?.[0];
  if (!link) throw new Error(`no invitation link in: ${message.text}`);
  return new URL(link).pathname;
}

async function ownerInvites(page: Page, email: string): Promise<void> {
  await signInAgainAs(page, ownerId);
  await page.goto(`/coven/${COVEN_SLUG}/members`);
  await page.getByRole('main').getByRole('button', { name: 'Invite', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Email Address' }).fill(email);
  await dialog.getByRole('radio', { name: 'Practitioner' }).check();
  await dialog.getByRole('button', { name: 'Send Invitation' }).click();
  await expect(dialog.getByRole('button', { name: 'Done' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toHaveCount(0);
}

async function refusalAt(page: Page, path: string): Promise<string> {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1, name: 'Your Invitation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept Invitation' })).toHaveCount(0);
  const refusal = page.getByRole('main').getByRole('alert');
  await expect(refusal).toBeVisible();
  const message = (await refusal.textContent()) ?? '';
  expect(message).not.toContain(COVEN_NAME);
  await assertNoSidewaysScroll(page, { restore: true });
  return message;
}

test.describe('a coven’s invitation from the account page', () => {
  test('D is told on /coven and in the account menu, and the shell redraws once D accepts it on the account page', async ({
    page,
  }) => {
    const invited = address('d');
    await ownerInvites(page, invited);
    const banner = page.getByRole('banner');

    await signInAs(page, address('other'));
    await page.goto('/coven');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'See your invitations' })).toHaveCount(0);
    await expect(banner.getByRole('button', { name: 'Fixture Person', exact: true })).toBeVisible();

    await signInAs(page, invited);
    await page.goto('/coven');
    const see = page.getByRole('link', { name: 'See your invitations' });
    await expect(see).toBeVisible();
    await assertNoAccessibilityViolations(page);
    await assertNoSidewaysScroll(page, { restore: true });

    const account = banner.getByRole('button', { name: 'Fixture Person, 1 coven invitation' });
    await account.click();
    await expect(banner.getByRole('link', { name: '1 Coven Invitation' })).toHaveAttribute(
      'href',
      '/account#account-invitations',
    );
    await page.keyboard.press('Escape');

    await see.click();
    await expect(page).toHaveURL(/\/account#account-invitations$/);
    await expect(page.getByRole('table', { name: 'Your Invitations' })).toBeVisible();
    await page.getByRole('button', { name: `Accept the invitation to ${COVEN_NAME}` }).click();

    await expect(page).toHaveURL(new RegExp(`/coven/${COVEN_SLUG}$`));
    await expect(page.getByRole('heading', { level: 1, name: COVEN_NAME })).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Fixture Person', exact: true })).toBeVisible();
  });
});

test.describe('a declined coven invitation', () => {
  test('E declines it on the account page, the link says so, and the owner sees it declined and removes it', async ({
    page,
  }) => {
    const invited = address('e');
    await ownerInvites(page, invited);
    const linkPath = await mailedInvitePath(invited);
    const banner = page.getByRole('banner');

    await signInAs(page, invited);
    await page.goto('/account#account-invitations');
    await expect(
      banner.getByRole('button', { name: 'Fixture Person, 1 coven invitation' }),
    ).toBeVisible();
    await page.getByRole('button', { name: `Decline the invitation to ${COVEN_NAME}` }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Decline', exact: true }).click();

    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: `Decline the invitation to ${COVEN_NAME}` }),
    ).toHaveCount(0);
    await expect(banner.getByRole('button', { name: 'Fixture Person', exact: true })).toBeVisible();
    const [declined] = await withSql(
      (sql) => sql`
        select declined_at is not null as declined, revoked_at is not null as revoked
        from invitations where email = ${invited}`,
    );
    expect(declined).toEqual({ declined: true, revoked: false });

    // The mailed link is the same invitation, refused for a reason of its own.
    const declinedMessage = await refusalAt(page, linkPath);
    expect(declinedMessage).not.toBe(await refusalAt(page, '/invite/not-a-real-token'));

    await signInAgainAs(page, ownerId);
    await page.goto(`/coven/${COVEN_SLUG}/invitations`);
    const row = page.getByRole('row').filter({ hasText: invited });
    await expect(row.locator('time')).toHaveCount(1);
    await expect(
      row.getByRole('button', { name: `Revoke the invitation to ${invited}` }),
    ).toHaveCount(0);
    const remove = row.getByRole('button', {
      name: `Remove the declined invitation to ${invited}`,
    });
    await expect(remove).toBeVisible();
    await assertNoAccessibilityViolations(page);

    await remove.click();
    const confirm = page.getByRole('dialog');
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await expect(page.getByRole('row').filter({ hasText: invited })).toHaveCount(0);
    const [removed] = await withSql(
      (sql) => sql`
        select declined_at is not null as declined, revoked_at is not null as revoked
        from invitations where email = ${invited}`,
    );
    expect(removed).toEqual({ declined: true, revoked: true });

    await signInAgainAs(page, (await userIdOf(invited)) as string);
    expect(await refusalAt(page, linkPath)).toBe(declinedMessage);
  });
});

// Last in the file: it deletes the coven every walk above shares; workers take a file's tests in order.
test.describe('a deleted coven’s invitation', () => {
  test('F’s link is refused for a reason of its own once the coven is deleted', async ({
    page,
  }) => {
    const invited = address('f');
    await ownerInvites(page, invited);
    const linkPath = await mailedInvitePath(invited);

    // F holds the invited address, verified, and the link is unexpired,
    // unrevoked and unanswered: it would be accepted but for the deletion.
    await signInAs(page, invited);
    await page.goto(linkPath);
    await expect(page.getByRole('button', { name: 'Accept Invitation' })).toBeVisible();

    await withSql(
      (sql) =>
        sql`update workspaces set deleted_at = now(), deleted_by = ${ownerId} where id = ${covenId}`,
    );
    const closedMessage = await refusalAt(page, linkPath);
    await assertNoAccessibilityViolations(page);

    // Not a broken link's reason.
    expect(closedMessage).not.toBe(await refusalAt(page, '/invite/not-a-real-token'));
    const seats = await withSql(
      (sql) => sql`
        select count(*)::int as count from workspace_members m join users u on u.id = m.user_id
        where m.workspace_id = ${covenId} and u.email = ${invited}`,
    );
    expect(seats[0].count).toBe(0);
  });
});

async function userIdOf(email: string): Promise<string> {
  const [{ id }] = await withSql((sql) => sql`select id from users where email = ${email}`);
  return id as string;
}

test('an invite address typed with spaces and a capitalised domain is tidied on leaving the field, and the invitation reaches it', async ({
  page,
}) => {
  const tidy = address('tidy');
  await signInAgainAs(page, ownerId);
  await page.goto(`/coven/${COVEN_SLUG}/members`);
  await page.getByRole('main').getByRole('button', { name: 'Invite', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const email = dialog.getByRole('textbox', { name: 'Email Address' });
  await email.fill(`  ${tidy.replace(DOMAIN, DOMAIN.toUpperCase())}  `);
  await email.blur();
  await expect(email).toHaveValue(tidy);
  await dialog.getByRole('radio', { name: 'Practitioner' }).check();
  await dialog.getByRole('button', { name: 'Send Invitation' }).click();
  await expect(dialog.getByRole('button', { name: 'Done' })).toBeVisible();
  expect((await latestMessageTo(tidy)).text).toContain('/invite/');
});
