import { randomUUID } from 'node:crypto';
import type { Browser, Page, Response } from '@playwright/test';
import postgres from 'postgres';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from '../axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from '../database';
import { latestMessageTo } from '../mailpit';
import { PRIMARY_ADMIN_EMAIL, signInAgainAs, signInAs } from '../session';

// Stories 58–62 walked in the browser, as a user and an admin would walk
// them: proving an address, changing it, granting and revoking admin, reading
// the privilege ledger, and inviting an admin by email
// (claude-docs/auth/admin-bootstrap.md, "The email page";
// claude-docs/design-decisions/mb.61-email-verification-and-delivery.md).
// Accounts are made by `signInAs` and rows a flow needs in place by raw SQL;
// the story's own step goes through the page, and a mailed link is
// read from Mailpit and followed.
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** A fresh address per call, so a retry or another worker never reads this run's mail. */
const address = (local: string) => `${local}-${randomUUID()}@email-and-admin.test`;

async function withSql<T>(work: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    return await work(sql);
  } finally {
    await sql.end();
  }
}

/** Names an account apart from the others, which `signInAs` all call Fixture Person. A name is no privilege, so the trigger on `users` asks no route. */
async function rename(userId: string, name: string): Promise<void> {
  await withSql((sql) => sql`update users set name = ${name} where id = ${userId}`);
}

/**
 * Opens `path` in this page, following each redirect itself. The session
 * rides as an extra request header (tests/e2e/session.ts), which the browser
 * drops on a redirect it follows, so a followed hop would arrive signed out.
 * Here each hop the server answers with a redirect is read and opened afresh,
 * session and all, as a browser holding the cookie would arrive there.
 */
async function visit(page: Page, path: string): Promise<Response> {
  let target = path;
  for (let hop = 0; hop < 5; hop += 1) {
    const response = await page.goto(target);
    if (!response) throw new Error(`no response for ${target}`);
    let request = response.request();
    while (request.redirectedFrom()) request = request.redirectedFrom()!;
    const first = await request.response();
    if (!first || first.status() < 300 || first.status() >= 400) return response;
    const location = new URL(first.headers().location, first.url());
    target = `${location.pathname}${location.search}`;
  }
  throw new Error(`more than five redirects from ${path}`);
}

const VERIFY_LINK = /https?:\/\/[^\s\])>"]+\/verify-email\?[^\s\])>"]+/;
const INVITE_LINK = /https?:\/\/[^\s\])>"]+\/invite\/[A-Za-z0-9_-]+/;

/**
 * The path of the link in the newest mail to `to` matching `pattern`, waiting
 * for one not in `seen`, and checking the mail went to that address alone.
 * The path rather than the URL: the build's origin is the link's fallback,
 * not this slot's server.
 */
async function mailedPath(
  to: string,
  pattern: RegExp,
  seen: readonly string[] = [],
): Promise<string> {
  const deadline = Date.now() + 10_000;
  for (;;) {
    const message = await latestMessageTo(to);
    const link = message.text.match(pattern)?.[0];
    if (link) {
      const url = new URL(link);
      const path = `${url.pathname}${url.search}`;
      if (!seen.includes(path)) {
        expect(message.to).toEqual([to]);
        return path;
      }
    }
    if (Date.now() > deadline) throw new Error(`no new ${pattern} link mailed to ${to}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

/** A browser holding no session at all, on this worker's server. */
async function signedOutPage(browser: Browser, baseURL: string | undefined): Promise<Page> {
  const context = await browser.newContext({ baseURL });
  return context.newPage();
}

/**
 * Sends a GraphQL operation from the page, as anyone could from the
 * browser's console: the direct action behind a control the page withholds.
 * A refusal must come from the server, not only from the page.
 */
async function sendFromPage(
  page: Page,
  query: string,
  variables: Record<string, unknown>,
): Promise<{ data?: unknown; errors?: { extensions?: { code?: string } }[] }> {
  return page.evaluate(
    async ({ query, variables }) => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      return response.json();
    },
    { query, variables },
  );
}

const SET_USER_ROLE = `
  mutation SetUserRole($userId: ID!, $role: UserRole!) {
    setUserRole(userId: $userId, role: $role) { id role }
  }
`;

const ACCEPT_INVITATION = `
  mutation AcceptInvitation($token: String!) {
    acceptInvitation(token: $token) { id }
  }
`;

/** Whether `page`'s account reaches the admin area: the layout's nav, or the 403 page. */
async function expectAdminArea(page: Page, reached: boolean): Promise<void> {
  const response = await visit(page, '/admin');
  if (reached) {
    expect(response.status()).toBe(200);
    await expect(page.getByRole('navigation', { name: 'Admin' })).toBeVisible();
  } else {
    expect(response.status()).toBe(403);
    await expect(
      page.getByRole('main').getByRole('heading', { level: 1, name: 'Not Authorized' }),
    ).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Admin' })).toHaveCount(0);
  }
}

/**
 * The primary admin's id: the account an earlier test signed in at the
 * address, or one made now, since the email index admits the address once.
 */
async function primaryAdminId(page: Page): Promise<string> {
  const [row] = await withSql(
    (sql) => sql`select id from users where email = ${PRIMARY_ADMIN_EMAIL}`,
  );
  if (row) return row.id as string;
  return (await signInAs(page, PRIMARY_ADMIN_EMAIL, ['google'], 'admin')).userId;
}

/** The users list narrowed to one address, and that address's row. */
async function userRow(page: Page, email: string) {
  const response = await visit(page, `/admin/users?query=${encodeURIComponent(email)}`);
  expect(response.status()).toBe(200);
  return page.getByRole('row', { name: new RegExp(email.replace(/[.+]/g, '\\$&')) });
}

/** The role cell, the third: its text opens with the role. */
const roleCell = (row: ReturnType<Page['getByRole']>) => row.getByRole('cell').nth(2);

/**
 * Opens `name`'s Change Role dialog from `row` and picks `role` in it,
 * answering the dialog for the caller to confirm.
 */
async function chooseRole(
  page: Page,
  row: ReturnType<Page['getByRole']>,
  name: string,
  role: 'User' | 'Curator' | 'Admin',
) {
  await row.getByRole('button', { name: `Change Role for ${name}` }).click();
  const dialog = page.getByRole('dialog', { name: 'Change Role' });
  // The radio's name opens with the role, its description following.
  await dialog.getByRole('radio', { name: new RegExp(`^${role}\\b`) }).check();
  return dialog;
}

/**
 * Invites `email` from /admin/invitations as the signed-in admin, to the
 * admin role unless told otherwise, and answers the mailed link's path.
 */
async function inviteAdmin(
  page: Page,
  email: string,
  { reason, role = 'Admin' }: { reason?: string; role?: 'Curator' | 'Admin' } = {},
): Promise<string> {
  await visit(page, '/admin/invitations');
  await page.getByRole('link', { name: 'New Invitation' }).click();
  const dialog = page.getByRole('dialog', { name: 'New Invitation' });
  await dialog.getByRole('textbox', { name: 'Email Address' }).fill(email);
  // The radio's name opens with the role, its description following.
  await dialog.getByRole('radio', { name: new RegExp(`^${role}\\b`) }).check();
  // By role: "Reason" also names its info tip's button.
  if (reason) await dialog.getByRole('textbox', { name: 'Reason' }).fill(reason);
  await dialog.getByRole('button', { name: 'Send Invitation' }).click();
  await expect(
    page.getByRole('region', { name: 'Admin Invitations' }).getByRole('status'),
  ).toContainText(email);
  return mailedPath(email, INVITE_LINK);
}

/** The refusal an invitation link shows: its alert, and no Accept beside it. */
async function expectInvitationRefused(page: Page, path: string): Promise<string> {
  const response = await visit(page, path);
  expect(response.status()).toBe(200);
  const alert = page.getByRole('main').getByRole('alert');
  await expect(alert).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept Invitation' })).toHaveCount(0);
  return (await alert.textContent()) ?? '';
}

test(
  'an unverified account is sent to the email page from every other page, and proves its address by the mailed link',
  { tag: '@story-58' },
  async ({ page, browser, baseURL }) => {
    const email = address('unproved');
    // Microsoft does not vouch for an address, so the account arrives unverified.
    const { userId } = await signInAs(page, email, ['microsoft'], 'user', {
      emailVerified: false,
    });

    // Every page it tries sends it to the email page, carrying where it was going.
    for (const path of ['/account', '/coven/new', '/coven']) {
      await visit(page, path);
      await expect(page).toHaveURL(`/account/email?next=${encodeURIComponent(path)}`);
      await expect(page.getByRole('textbox', { name: 'Email Address' })).toHaveValue(email);
    }
    // An unverified account is offered no way on but proving the address.
    await expect(page.getByRole('link', { name: 'Continue to Account' })).toHaveCount(0);
    await assertNoAccessibilityViolations(page);
    await assertNoSidewaysScroll(page, { restore: true });

    // It asks for the link, which is mailed to that address alone.
    await page.getByRole('button', { name: 'Send Confirmation' }).click();
    await expect(page.getByRole('main').getByRole('status')).toContainText(email);
    const link = await mailedPath(email, VERIFY_LINK);

    // Opened in a browser signed in to nothing, the link goes to sign-in,
    // which returns to the email page, and verifies nothing.
    const stranger = await signedOutPage(browser, baseURL);
    await stranger.goto(link);
    await expect(stranger).toHaveURL('/sign-in?next=%2Faccount%2Femail&error=sign_in_to_verify');
    await expect(stranger.getByRole('main').getByRole('alert')).toBeVisible();
    await assertNoAccessibilityViolations(stranger);
    await stranger.context().close();

    // Signed in again, the account is still unverified: still sent to the email page.
    await signInAgainAs(page, userId);
    await visit(page, '/coven');
    await expect(page).toHaveURL('/account/email?next=%2Fcoven');

    // Followed from its own session, the link verifies the address and lands
    // on the confirmed view, whose Continue goes on to where it was going.
    await visit(page, link);
    await expect(page).toHaveURL('/account/email?verified&next=%2Fcoven');
    await expect(page.getByRole('main')).toContainText(email);
    const onward = page.getByRole('link', { name: 'Continue', exact: true });
    await expect(onward).toBeVisible();
    await assertNoAccessibilityViolations(page);
    await onward.click();
    await expect(page).toHaveURL('/coven');

    // The rest of the shell is open to it now: no page sends it back.
    const account = await visit(page, '/account');
    expect(account.status()).toBe(200);
    await expect(page).toHaveURL('/account');
    await expect(
      page.getByRole('main').getByRole('textbox', { name: 'Email Address' }),
    ).toHaveValue(email);
  },
);

test(
  'a verified account changes its address, which takes effect only when the link mailed to the new one is followed from its session',
  { tag: '@story-59' },
  async ({ page, browser, baseURL }) => {
    const before = address('before');
    const after = address('after');
    await signInAs(page, before, ['google']);

    // The page starts from the address the account holds, with nothing to send.
    await visit(page, '/account/email');
    const field = page.getByRole('textbox', { name: 'Email Address' });
    const send = page.getByRole('button', { name: 'Send Confirmation' });
    await expect(field).toHaveValue(before);
    await expect(send).toBeDisabled();

    await field.fill(after);
    await expect(send).toBeEnabled();
    await send.click();
    await expect(page.getByRole('main').getByRole('status')).toContainText(after);
    await assertNoAccessibilityViolations(page);
    const link = await mailedPath(after, VERIFY_LINK);

    // Until the link is followed, the account keeps the old address.
    await visit(page, '/account/email');
    await expect(field).toHaveValue(before);
    await visit(page, '/account');
    await expect(
      page.getByRole('main').getByRole('textbox', { name: 'Email Address' }),
    ).toHaveValue(before);

    // A browser signed in to nothing is sent to sign-in, and changes nothing.
    const stranger = await signedOutPage(browser, baseURL);
    await stranger.goto(link);
    await expect(stranger).toHaveURL('/sign-in?next=%2Faccount%2Femail&error=sign_in_to_verify');
    await expect(stranger.getByRole('main').getByRole('alert')).toBeVisible();
    await stranger.context().close();
    await visit(page, '/account/email');
    await expect(field).toHaveValue(before);

    // Followed from the account's own session, the new address is its, verified.
    await visit(page, link);
    await expect(page).toHaveURL(/^[^?]+\/account\/email\?verified$/);
    await expect(page.getByRole('main')).toContainText(after);
    await expect(page.getByRole('link', { name: 'Continue', exact: true })).toBeVisible();
    await assertNoAccessibilityViolations(page);

    await visit(page, '/account');
    await expect(
      page.getByRole('main').getByRole('textbox', { name: 'Email Address' }),
    ).toHaveValue(after);
    // Verified, so the shell is open: /coven answers itself, not the email page.
    await visit(page, '/coven');
    await expect(page).toHaveURL('/coven');
  },
);

test(
  'an admin promotes a user with a reason, who then reaches the admin area, and revokes them, who then meets the 403',
  { tag: '@story-60' },
  async ({ page }) => {
    const granteeEmail = address('grantee');
    const { userId: grantee } = await signInAs(page, granteeEmail);
    // Before: a user, refused the admin area.
    await expectAdminArea(page, false);

    const { userId: admin } = await signInAs(page, address('granting-admin'), ['discord'], 'admin');
    const row = await userRow(page, granteeEmail);
    await expect(roleCell(row)).toHaveText(/^User/);
    await expect(row.getByRole('cell').nth(3)).toHaveText(/^No/);

    const granting = await chooseRole(page, row, 'Fixture Person', 'Admin');
    await expect(granting).toContainText('Fixture Person');
    await granting.getByRole('textbox', { name: 'Reason' }).fill('Curates the celestial bodies');
    await assertNoAccessibilityViolations(page);
    await granting.getByRole('button', { name: 'Promote' }).click();
    await expect(granting).toHaveCount(0);

    // An admin now, who may create a coven: the creation cell holds the mark alone.
    await expect(roleCell(row)).toHaveText(/^Admin/);
    await expect(row.getByRole('cell').nth(3)).toHaveText('Yes');

    await signInAgainAs(page, grantee);
    await expectAdminArea(page, true);

    // Revoked again, behind its own modal; the creation flag stays.
    await signInAgainAs(page, admin);
    const again = await userRow(page, granteeEmail);
    const revoking = await chooseRole(page, again, 'Fixture Person', 'User');
    await expect(revoking).toContainText('Fixture Person');
    await assertNoAccessibilityViolations(page);
    await revoking.getByRole('button', { name: 'Demote' }).click();
    await expect(revoking).toHaveCount(0);
    await expect(roleCell(again)).toHaveText(/^User/);
    await expect(again.getByRole('cell').nth(3)).toHaveText(/^Yes/);
    await expect(
      again.getByRole('button', { name: 'Change Role for Fixture Person' }),
    ).toBeVisible();

    await signInAgainAs(page, grantee);
    await expectAdminArea(page, false);
  },
);

// Story 60's three tests on the primary admin share one worker, in this order,
// because the last demotes every other admin in the worker's database, the
// primary included, which the two before it need in place. Serial inside this
// block alone: the tests after it make their own admins.
test.describe('the primary admin', () => {
  test.describe.configure({ mode: 'serial' });

  test(
    'another admin cannot revoke the primary admin: its Change Role is locked with the reason, and the server refuses the revoke sent directly',
    { tag: '@story-60' },
    async ({ page }) => {
      const primary = await primaryAdminId(page);
      const peerEmail = address('peer-admin');
      await signInAs(page, peerEmail, ['discord'], 'admin');
      await signInAs(page, address('acting-admin'), ['discord'], 'admin');

      // Another admin's Change Role is there to be used: the guard is about the primary admin alone.
      const peer = await userRow(page, peerEmail);
      const usable = peer.getByRole('button', { name: 'Change Role for Fixture Person' });
      await expect(usable).toBeVisible();
      await expect(usable).not.toHaveAttribute('aria-disabled', 'true');

      // The primary admin's row: marked, its Change Role in view but locked, saying why.
      const row = await userRow(page, PRIMARY_ADMIN_EMAIL);
      await expect(row.getByRole('button', { name: 'Primary Admin' })).toBeVisible();
      await expect(roleCell(row)).toHaveText(/^Admin/);
      const locked = row.getByRole('button', { name: 'Change Role for Fixture Person' });
      await expect(locked).toHaveAttribute('aria-disabled', 'true');
      await expect(locked).toHaveAccessibleDescription(/\S/);

      // Pressed anyway, from the keyboard since a pointer click waits for an
      // enabled control, it says why again and opens nothing.
      await locked.focus();
      await page.keyboard.press('Enter');
      await expect(row.getByRole('alert')).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await assertNoAccessibilityViolations(page);

      // Sent straight to the server, the revoke is refused there too.
      const result = await sendFromPage(page, SET_USER_ROLE, { userId: primary, role: 'user' });
      expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');

      // Read afresh, the primary admin is an admin still, and reaches the admin area.
      const reread = await userRow(page, PRIMARY_ADMIN_EMAIL);
      await expect(roleCell(reread)).toHaveText(/^Admin/);
      await signInAgainAs(page, primary);
      await expectAdminArea(page, true);
    },
  );

  test(
    "the primary admin pauses admin changes: another admin's grant is refused while the primary's works, and resuming restores it",
    { tag: '@story-60' },
    async ({ page }) => {
      const primary = await primaryAdminId(page);
      const granteeEmail = address('paused-grantee');
      const { userId: grantee } = await signInAs(page, granteeEmail);
      const { userId: other } = await signInAs(page, address('other-admin'), ['discord'], 'admin');
      const list = `/admin/users?query=${encodeURIComponent(granteeEmail)}`;
      // The page's statement while paused, and none while open.
      const status = page.getByRole('main').getByRole('status');

      // Another admin sees the switch, unusable, and why.
      await visit(page, list);
      const unusable = page.getByRole('button', { name: 'Pause Admin Changes' });
      await expect(unusable).toHaveAttribute('aria-disabled', 'true');
      await expect(unusable).toHaveAccessibleDescription(/\S/);
      await expect(status).toHaveCount(0);

      // The primary admin pauses, behind a modal asking first. Scoped to it:
      // the button that opens it has the same name.
      await signInAgainAs(page, primary);
      await visit(page, list);
      await page.getByRole('button', { name: 'Pause Admin Changes' }).click();
      const pausing = page.getByRole('dialog', { name: 'Pause Admin Changes' });
      await pausing.getByRole('button', { name: 'Pause Admin Changes' }).click();
      await expect(pausing).toHaveCount(0);
      await expect(status).toBeVisible();
      await expect(page.getByRole('button', { name: 'Resume Admin Changes' })).toBeEnabled();
      await assertNoAccessibilityViolations(page);

      // The other admin's Change Role is locked; tried from the keyboard, it says
      // why and opens nothing, and Approve is locked the same way.
      await signInAgainAs(page, other);
      await visit(page, list);
      await expect(status).toBeVisible();
      const row = page.getByRole('row', { name: new RegExp(granteeEmail.replace(/[.]/g, '\\.')) });
      const grant = row.getByRole('button', { name: 'Change Role for Fixture Person' });
      await expect(grant).toHaveAttribute('aria-disabled', 'true');
      await expect(grant).toHaveAccessibleDescription(/\S/);
      await grant.focus();
      await page.keyboard.press('Enter');
      await expect(row.getByRole('alert')).toBeVisible();
      await assertNoAccessibilityViolations(page);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      const approve = row.getByRole('button', { name: 'Approve Fixture Person' });
      await expect(approve).toHaveAttribute('aria-disabled', 'true');
      await expect(approve).toHaveAccessibleDescription(/\S/);
      // Sent straight to the server, the grant is refused there too.
      const refused = await sendFromPage(page, SET_USER_ROLE, { userId: grantee, role: 'admin' });
      expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      await visit(page, list);
      await expect(roleCell(row)).toHaveText(/^User/);
      await expect(row.getByRole('cell').nth(3)).toHaveText(/^No/);

      // The primary admin, whom the pause does not bind, still promotes.
      await signInAgainAs(page, primary);
      await visit(page, list);
      const granting = await chooseRole(page, row, 'Fixture Person', 'Admin');
      await granting.getByRole('button', { name: 'Promote' }).click();
      await expect(granting).toHaveCount(0);
      await expect(roleCell(row)).toHaveText(/^Admin/);

      // And resumes.
      await page.getByRole('button', { name: 'Resume Admin Changes' }).click();
      await expect(page.getByRole('button', { name: 'Pause Admin Changes' })).toBeEnabled();
      await expect(status).toHaveCount(0);

      // The other admin's controls work again: the revoke goes through.
      await signInAgainAs(page, other);
      await visit(page, list);
      await expect(status).toHaveCount(0);
      const revoking = await chooseRole(page, row, 'Fixture Person', 'User');
      await revoking.getByRole('button', { name: 'Demote' }).click();
      await expect(revoking).toHaveCount(0);
      await expect(roleCell(row)).toHaveText(/^User/);
    },
  );

  // Last of the three, and it must stay so: it demotes every other admin in the
  // worker's database, the primary admin included.
  test(
    'the last admin is refused revoking their own admin, and stays an admin',
    { tag: '@story-60' },
    async ({ page }) => {
      const loneEmail = address('last-admin');
      const { userId: lone } = await signInAs(page, loneEmail, ['discord'], 'admin');
      // Every other admin demoted as a `psql` fix would, so this one is the last.
      const demoted = await withSql((sql) =>
        sql.begin(async (tx) => {
          await tx`select set_config('app.privilege_route', 'manual', true)`;
          return tx`
          update users set role = 'user', updated_by = ${lone}
          where role = 'admin' and deleted_at is null and id <> ${lone}
          returning id
        `;
        }),
      );
      expect(demoted.length).toBeGreaterThan(0);

      const response = await visit(page, '/admin/users?role=admin');
      expect(response.status()).toBe(200);
      const admins = page.getByRole('row').filter({ has: page.getByRole('cell') });
      await expect(admins).toHaveCount(1);
      const row = await userRow(page, loneEmail);

      // The control is offered, since the list cannot know the count stays
      // above one; pressed, the server refuses and the row says why.
      const revoking = await chooseRole(page, row, 'Fixture Person', 'User');
      await revoking.getByRole('button', { name: 'Demote' }).click();
      await expect(revoking).toHaveCount(0);
      await expect(row.getByRole('alert')).toBeVisible();
      // Said under the Change Role that opened the dialog, which has the focus back.
      await expect(
        row.getByRole('button', { name: 'Change Role for Fixture Person', exact: true }),
      ).toBeFocused();
      await assertNoAccessibilityViolations(page);

      const reread = await userRow(page, loneEmail);
      await expect(roleCell(reread)).toHaveText(/^Admin/);
      await expectAdminArea(page, true);
    },
  );
});

test(
  'an admin reads every privilege change newest first, with who, how, when and why, narrows it to one user, and a user meets the 403',
  { tag: '@story-61' },
  async ({ page }) => {
    const subjectEmail = address('ledger-subject');
    const { userId: subject } = await signInAs(page, subjectEmail);
    await rename(subject, 'Ledger Fixturewort');
    const { userId: operator } = await signInAs(page, address('operator'));
    await rename(operator, 'Breakglass Operator');
    const { userId: admin } = await signInAs(page, address('ledger-admin'), ['discord'], 'admin');
    await rename(admin, 'Ledger Keeper');
    // To the second the database stamps, a little before this test's first change.
    const started = Date.now() - 1000;

    // Two changes made where an admin makes them, each with its reason.
    const row = await userRow(page, subjectEmail);
    await row.getByRole('button', { name: 'Approve Ledger Fixturewort' }).click();
    const approving = page.getByRole('dialog', { name: 'Approve Coven Creation' });
    await approving.getByRole('textbox', { name: 'Reason' }).fill('Runs the Tuesday circle');
    await approving.getByRole('button', { name: 'Approve' }).click();
    await expect(approving).toHaveCount(0);
    await expect(row.getByRole('cell').nth(3)).toHaveText(/^Yes/);
    const granting = await chooseRole(page, row, 'Ledger Fixturewort', 'Admin');
    await granting.getByRole('textbox', { name: 'Reason' }).fill('Curates the celestial bodies');
    await granting.getByRole('button', { name: 'Promote' }).click();
    await expect(granting).toHaveCount(0);
    await expect(roleCell(row)).toHaveText(/^Admin/);

    // And a break-glass fix, made outside the app as a `psql` fix is: it
    // must say it is one, may say why, and is stamped with whoever ran it.
    await withSql((sql) =>
      sql.begin(async (tx) => {
        await tx`select set_config('app.privilege_route', 'manual', true),
                        set_config('app.privilege_note', 'Restored after the audit', true)`;
        await tx`update users set role = 'user', updated_by = ${operator} where id = ${subject}`;
      }),
    );

    // The ledger, by its tab on the People page beside Users.
    await visit(page, '/admin/users');
    const tab = page
      .getByRole('navigation', { name: 'People' })
      .getByRole('link', { name: 'Privilege Changes' });
    await tab.click();
    await expect(page).toHaveURL(/\/admin\/privilege-changes$/);
    await expect(tab).toHaveAttribute('aria-current', 'page');
    const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
    // Every user's changes, not only this subject's: the seed's and each
    // admin signed in here are on it too.
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(3);
    // Newest first: the break-glass fix heads it.
    await expect(rows.first().getByRole('cell').nth(1)).toHaveText('Ledger Fixturewort');
    await expect(rows.first().getByRole('cell').nth(4)).toHaveText('Manual fix');
    for (const colorScheme of ['dark', 'light'] as const) {
      await page.emulateMedia({ colorScheme });
      await assertNoAccessibilityViolations(page);
    }

    // Narrowed to the subject from their row's history link on the users list.
    const listed = await userRow(page, subjectEmail);
    const history = listed.getByRole('link', { name: 'Privilege changes for Ledger Fixturewort' });
    await history.hover();
    await expect(page.getByRole('tooltip')).toBeVisible();
    for (const colorScheme of ['dark', 'light'] as const) {
      await page.emulateMedia({ colorScheme });
      await assertNoAccessibilityViolations(page);
    }
    await history.click();
    await expect(page).toHaveURL(
      `/admin/privilege-changes?query=${encodeURIComponent(subjectEmail)}`,
    );
    await expect(
      page.getByRole('search', { name: 'Filter Privilege Changes' }).getByLabel('Name or Email'),
    ).toHaveValue(subjectEmail);

    // Their three changes alone, newest first: what changed, how, who, why.
    // The labels are the only rendering of the privilege, the change and
    // the route, so they are the state here.
    await expect(rows).toHaveCount(3);
    const cells = async (index: number) => rows.nth(index).getByRole('cell').allTextContents();
    expect((await cells(0)).slice(1)).toEqual([
      'Ledger Fixturewort',
      'Admin',
      'Revoked',
      'Manual fix',
      'Breakglass Operator',
      'Restored after the audit',
    ]);
    expect((await cells(1)).slice(1)).toEqual([
      'Ledger Fixturewort',
      'Admin',
      'Granted',
      'By an admin',
      'Ledger Keeper',
      'Curates the celestial bodies',
    ]);
    expect((await cells(2)).slice(1)).toEqual([
      'Ledger Fixturewort',
      'Coven Creation',
      'Granted',
      'By an admin',
      'Ledger Keeper',
      'Runs the Tuesday circle',
    ]);
    // When: each stamped since this test began, the newest first.
    const times = await Promise.all(
      [0, 1, 2].map(async (index) =>
        Date.parse(
          (await rows
            .nth(index)
            .getByRole('cell')
            .first()
            .locator('time')
            .getAttribute('datetime')) ?? '',
        ),
      ),
    );
    for (const time of times) expect(time).toBeGreaterThanOrEqual(started);
    expect(times).toEqual([...times].sort((a, b) => b - a));
    await assertNoAccessibilityViolations(page);

    // Typed by hand, the search takes part of an address in any case; the
    // privilege dropdown, a select-only box once the page has hydrated,
    // applies the moment a choice is picked, carrying the search with it.
    await page.waitForLoadState('networkidle');
    const filter = page.getByRole('search', { name: 'Filter Privilege Changes' });
    const search = filter.getByLabel('Name or Email');
    const part = subjectEmail.split('@')[0].toUpperCase();
    await search.fill(part);
    const privilege = filter.getByRole('combobox', { name: 'Privilege' });
    const choices = filter.getByRole('listbox', { name: 'Privilege choices' });
    await privilege.click();
    await choices.getByRole('option', { name: 'Coven Creation', exact: true }).click();
    await expect(page).toHaveURL(
      `/admin/privilege-changes?query=${encodeURIComponent(part)}&privilege=create_workspace`,
    );
    await expect(rows).toHaveCount(1);
    await expect(rows.first().getByRole('cell').nth(1)).toHaveText('Ledger Fixturewort');
    await expect(rows.first().getByRole('cell').nth(5)).toHaveText('Ledger Keeper');
    await privilege.click();
    await choices.getByRole('option', { name: 'Admin', exact: true }).click();
    await expect(page).toHaveURL(/privilege=admin$/);
    await expect(rows).toHaveCount(2);

    // A search nobody matches leaves no table, only the page saying so.
    await search.fill('nobody-by-this-name');
    await privilege.click();
    await choices.getByRole('option', { name: 'Coven Creation', exact: true }).click();
    await expect(page).toHaveURL(/query=nobody-by-this-name&privilege=create_workspace$/);
    await expect(page.getByRole('table')).toHaveCount(0);
    await assertNoAccessibilityViolations(page);

    // The subject, a user again, is refused the ledger it has just been shown in.
    await signInAgainAs(page, subject);
    const refused = await visit(page, '/admin/privilege-changes');
    expect(refused.status()).toBe(403);
    await expect(
      page.getByRole('main').getByRole('heading', { level: 1, name: 'Not Authorized' }),
    ).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
  },
);

test(
  'an admin invites an address with a reason: listed as pending, mailed to that address alone, the link nowhere on the page, and a user meets the 403',
  { tag: '@story-62' },
  async ({ page }) => {
    const invited = address('invited');
    await signInAs(page, address('inviting-admin'), ['discord'], 'admin');
    await visit(page, '/admin/invitations');

    const section = page.getByRole('region', { name: 'Admin Invitations' });
    // New Invitation is the tab's action, beside the page's heading.
    await page.getByRole('link', { name: 'New Invitation' }).click();
    const dialog = page.getByRole('dialog', { name: 'New Invitation' });
    const send = dialog.getByRole('button', { name: 'Send Invitation' });
    const email = dialog.getByRole('textbox', { name: 'Email Address' });
    // It opens on its first field, with nothing to send yet.
    await expect(email).toBeFocused();
    await expect(send).toBeDisabled();
    await email.fill(invited);
    await dialog.getByRole('textbox', { name: 'Reason' }).fill('Curates the resins');
    await expect(send).toBeEnabled();
    await assertNoAccessibilityViolations(page);
    await send.click();

    await expect(section.getByRole('status')).toContainText(invited);
    const row = section.getByRole('row', { name: new RegExp(invited.replace(/[.]/g, '\\.')) });
    await expect(row).toContainText('Curates the resins');
    // The role the form starts on, the lesser one.
    await expect(row).toContainText('Curator');
    // Mailed to the invited address alone, and the page answers no link:
    // the mail is the only place the token is.
    const path = await mailedPath(invited, INVITE_LINK);
    const token = path.split('/').pop()!;
    expect(await page.content()).not.toContain(token);
    await assertNoAccessibilityViolations(page);
    await visit(page, '/admin/invitations');
    await expect(row).toBeVisible();
    expect(await page.content()).not.toContain(token);

    // A user is refused the page the admin has just used.
    await signInAs(page, address('not-an-admin'));
    const refused = await visit(page, '/admin/invitations?invite');
    expect(refused.status()).toBe(403);
    await expect(
      page.getByRole('main').getByRole('heading', { level: 1, name: 'Not Authorized' }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  },
);

test(
  'an invitation is accepted only by an account that has proved the invited address, which then lands on /admin as an admin',
  { tag: '@story-62' },
  async ({ page, browser, baseURL }) => {
    const invited = address('invitee');
    await signInAs(page, address('inviting-admin'), ['discord'], 'admin');
    const path = await inviteAdmin(page, invited, { reason: 'Curates the resins' });

    // Signed out: asked to sign in and brought back, shown nothing of the invitation.
    const visitor = await signedOutPage(browser, baseURL);
    const opened = await visitor.goto(path);
    expect(opened?.status()).toBe(200);
    expect(new URL(visitor.url()).pathname).toBe(path);
    await expect(visitor.getByRole('link', { name: 'Sign In' })).toHaveAttribute(
      'href',
      `/sign-in?next=${encodeURIComponent(path)}`,
    );
    // Not even what kind of invitation it is: the word admin appears nowhere on it.
    await expect(visitor.getByRole('main').getByText(/admin/i)).toHaveCount(0);
    await expect(visitor.getByRole('main')).not.toContainText(invited);
    await expect(visitor.getByRole('main')).not.toContainText('Curates the resins');
    await expect(visitor.getByRole('button', { name: 'Accept Invitation' })).toHaveCount(0);
    await assertNoAccessibilityViolations(visitor);
    await assertNoSidewaysScroll(visitor);
    await visitor.context().close();

    // An account that has proved a different address is refused, at the
    // page and at the server, and is no admin after.
    await signInAs(page, address('stranger'), ['google']);
    const different = await expectInvitationRefused(page, path);
    await expect(page.getByRole('link', { name: 'Confirm Your Email' })).toHaveCount(0);
    await assertNoAccessibilityViolations(page);
    const token = path.split('/').pop()!;
    const refused = await sendFromPage(page, ACCEPT_INVITATION, { token });
    expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    await expectAdminArea(page, false);

    // The invited address, not yet proved: refused with its own reason, and
    // pointed at the email page with the way back.
    const { userId: invitee } = await signInAs(page, invited, ['microsoft'], 'user', {
      emailVerified: false,
    });
    await rename(invitee, 'Invited Fixturewort');
    const unverified = await expectInvitationRefused(page, path);
    expect(unverified).not.toBe(different);
    const confirm = page.getByRole('link', { name: 'Confirm Your Email' });
    await expect(confirm).toBeVisible();
    await assertNoAccessibilityViolations(page);
    await confirm.click();
    await expect(page).toHaveURL(`/account/email?next=${encodeURIComponent(path)}`);

    // It proves the address by the mailed link, and Continue brings it back to the invitation.
    await page.getByRole('button', { name: 'Send Confirmation' }).click();
    await expect(page.getByRole('main').getByRole('status')).toContainText(invited);
    const link = await mailedPath(invited, VERIFY_LINK);
    await visit(page, link);
    await page.getByRole('link', { name: 'Continue', exact: true }).click();
    await expect(page).toHaveURL(path);

    const accept = page.getByRole('button', { name: 'Accept Invitation' });
    await expect(accept).toBeVisible();
    await assertNoAccessibilityViolations(page);
    await assertNoSidewaysScroll(page, { restore: true });
    await accept.click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible();
    await expectAdminArea(page, true);

    // The ledger records both grants as the invitation's, made by the
    // invitee, with the inviting admin's reason.
    await visit(page, `/admin/privilege-changes?query=${encodeURIComponent(invited)}`);
    const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
    await expect(rows).toHaveCount(2);
    const changes = await Promise.all(
      [0, 1].map(async (index) =>
        (await rows.nth(index).getByRole('cell').allTextContents()).slice(1),
      ),
    );
    expect([...changes].sort((a, b) => a[1].localeCompare(b[1]))).toEqual([
      [
        'Invited Fixturewort',
        'Admin',
        'Granted',
        'Invitation accepted',
        'Invited Fixturewort',
        'Curates the resins',
      ],
      [
        'Invited Fixturewort',
        'Coven Creation',
        'Granted',
        'Invitation accepted',
        'Invited Fixturewort',
        'Curates the resins',
      ],
    ]);
  },
);

// The same invitation, to the curator role. The acceptance is the
// admin's above; this proves what accepting it grants, and what it does not.
test(
  'an invitation to the curator role lands its invitee on /admin with the curation pages and no People, both grants in the ledger',
  { tag: '@story-62' },
  async ({ page }) => {
    const invited = address('curator-invitee');
    const { userId: admin } = await signInAs(page, address('inviting-admin'), ['discord'], 'admin');
    const path = await inviteAdmin(page, invited, { reason: 'Keeps the herbals', role: 'Curator' });

    const { userId: invitee } = await signInAs(page, invited, ['google']);
    await rename(invitee, 'Curator Fixturewort');
    await visit(page, path);
    await page.getByRole('button', { name: 'Accept Invitation' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expectAdminArea(page, true);
    const nav = page.getByRole('navigation', { name: 'Admin' });
    await expect(nav.getByRole('link', { name: 'Compendium', exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'People' })).toHaveCount(0);
    expect((await visit(page, '/admin/users')).status()).toBe(403);

    // The ledger is People's, so the inviting admin reads it.
    await signInAgainAs(page, admin);
    await visit(page, `/admin/privilege-changes?query=${encodeURIComponent(invited)}`);
    const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
    await expect(rows).toHaveCount(2);
    const changes = await Promise.all(
      [0, 1].map(async (index) =>
        (await rows.nth(index).getByRole('cell').allTextContents()).slice(1),
      ),
    );
    expect([...changes].sort((a, b) => a[1].localeCompare(b[1]))).toEqual([
      [
        'Curator Fixturewort',
        'Coven Creation',
        'Granted',
        'Invitation accepted',
        'Curator Fixturewort',
        'Keeps the herbals',
      ],
      [
        'Curator Fixturewort',
        'Curator',
        'Granted',
        'Invitation accepted',
        'Curator Fixturewort',
        'Keeps the herbals',
      ],
    ]);
  },
);

test(
  'an invitation link that was used, withdrawn after confirming, or has run out is refused, each with a reason of its own',
  { tag: '@story-62' },
  async ({ page }) => {
    const usedEmail = address('used');
    const withdrawnEmail = address('withdrawn');
    const lapsedEmail = address('lapsed');
    const { userId: admin } = await signInAs(page, address('inviting-admin'), ['discord'], 'admin');
    const used = await inviteAdmin(page, usedEmail);
    const withdrawn = await inviteAdmin(page, withdrawnEmail);
    const lapsed = await inviteAdmin(page, lapsedEmail);

    // Each link is live to its own verified account before anything happens to it.
    const accounts: Record<string, string> = {};
    for (const [email, path] of [
      [usedEmail, used],
      [withdrawnEmail, withdrawn],
      [lapsedEmail, lapsed],
    ]) {
      accounts[email] = (await signInAs(page, email, ['google'])).userId;
      await visit(page, path);
      await expect(page.getByRole('button', { name: 'Accept Invitation' })).toBeVisible();
    }

    // Used: accepted once, then opened again.
    await signInAgainAs(page, accounts[usedEmail]);
    await visit(page, used);
    await page.getByRole('button', { name: 'Accept Invitation' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    const usedReason = await expectInvitationRefused(page, used);

    // Withdrawn: the admin revokes it from the list after confirming.
    await signInAgainAs(page, admin);
    await visit(page, '/admin/invitations');
    const section = page.getByRole('region', { name: 'Admin Invitations' });
    await section
      .getByRole('button', { name: `Revoke the invitation to ${withdrawnEmail}` })
      .click();
    const confirm = page.getByRole('dialog', { name: 'Revoke Invitation' });
    await expect(confirm).toContainText(withdrawnEmail);
    await assertNoAccessibilityViolations(page);
    await confirm.getByRole('button', { name: 'Revoke' }).click();
    await expect(confirm).toHaveCount(0);
    await expect(
      section.getByRole('row', { name: new RegExp(withdrawnEmail.replace(/[.]/g, '\\.')) }),
    ).toHaveCount(0);
    // Its Revoke went with the row: the page's heading has the focus.
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused();
    // Still listed: the two that were not withdrawn, the lapsed one until it lapses.
    await expect(
      section.getByRole('row', { name: new RegExp(lapsedEmail.replace(/[.]/g, '\\.')) }),
    ).toBeVisible();

    await signInAgainAs(page, accounts[withdrawnEmail]);
    const withdrawnReason = await expectInvitationRefused(page, withdrawn);
    await assertNoAccessibilityViolations(page);
    // Sent straight to the server, the accept is refused there too.
    const refused = await sendFromPage(page, ACCEPT_INVITATION, {
      token: withdrawn.split('/').pop(),
    });
    expect(refused.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    await expectAdminArea(page, false);

    // Run out: its seven days backdated past, as time would.
    await withSql(
      (sql) => sql`
        update invitations set expires_at = now() - interval '1 second'
        where email = ${lapsedEmail} and accepted_at is null and revoked_at is null
      `,
    );
    await signInAgainAs(page, accounts[lapsedEmail]);
    const lapsedReason = await expectInvitationRefused(page, lapsed);
    await expectAdminArea(page, false);

    // Three refusals, three reasons.
    expect(new Set([usedReason, withdrawnReason, lapsedReason]).size).toBe(3);
  },
);
