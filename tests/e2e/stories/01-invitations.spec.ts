import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import postgres from 'postgres';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from '../axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from '../database';
import { latestMessageTo } from '../mailpit';
import { signInAgainAs, signInAs } from '../session';
import { slugify } from '@/lib/slugify';

// Inviting by mail, accepting, revoking and the dead-link refusals: only the verified holder of the address gets
// in. The link is read from the mail, the only place its token is. A refusal is proved twice: the control is
// absent, and the same request made by hand to `/api/graphql` is refused too. Serial, as later tests read the mailed link.
test.describe.configure({ mode: 'serial' });

const COVEN_NAME = 'Fixture Invitation Coven';
const COVEN_SLUG = slugify(COVEN_NAME);
// Mailpit outlives the database, so every address is new to each run.
const run = randomUUID().slice(0, 8);
const address = (local: string) => `${local}-${run}@invitation-story.test`;

type Person = { id: string; name: string; email: string };
const blank = (): Person => ({ id: '', name: '', email: '' });
const people = {
  owner: blank(),
  member: blank(),
  viewer: blank(),
};
let covenId = '';

/** The first invitation, which its holder accepts by the link (stories 4 and 6). */
const invited = { ...blank(), email: address('invited') };
let invitedPath = '';
/** What the used link says to its holder, once accepted. */
let usedRefusal = '';
/** What the revoked link says to its holder. */
let revokedRefusal = '';

async function withSql<T>(work: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    return await work(sql);
  } finally {
    await sql.end();
  }
}

/**
 * A verified account at `email` signed in on `page`, named so its row on the members roll can be told from
 * the rest: `signInAs` names everyone alike.
 */
async function signInNamed(page: Page, email: string, name: string): Promise<Person> {
  const { userId } = await signInAs(page, email);
  await withSql((sql) => sql`update users set name = ${name} where id = ${userId}`);
  return { id: userId, name, email };
}

/** The invitation's path from the mailed link: the build's origin is its fallback, not this server. */
async function mailedInvitePath(to: string): Promise<string> {
  const message = await latestMessageTo(to);
  const link = message.text.match(/https?:\/\/\S+\/invite\/[A-Za-z0-9_-]+/)?.[0];
  if (!link) throw new Error(`no invitation link in the mail to ${to}`);
  return new URL(link).pathname;
}

/** How many messages Mailpit holds to `to`, read at once rather than waited for. */
async function messagesTo(to: string): Promise<number> {
  const base = process.env.MAILPIT_URL;
  if (!base)
    throw new Error("MAILPIT_URL is not set; the e2e run needs compose's `mailpit` service");
  const search = new URL('/api/v1/search', base);
  search.searchParams.set('query', `to:"${to}"`);
  const response = await fetch(search);
  const { messages } = (await response.json()) as { messages: unknown[] };
  return messages.length;
}

/**
 * Sends a GraphQL operation from the page as the browser's own client does, carrying this browser's session
 * and nothing else. Answers the response body.
 */
async function sendFromPage(
  page: Page,
  query: string,
  variables: Record<string, string>,
): Promise<{ data?: unknown; errors?: unknown[] }> {
  return page.evaluate(
    async ({ query, variables }) => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/graphql-response+json, application/json',
        },
        body: JSON.stringify({ query, variables }),
      });
      return (await response.json()) as { data?: unknown; errors?: unknown[] };
    },
    { query, variables },
  );
}

const CREATE_INVITATION = `mutation ($workspaceId: ID!, $email: String!, $role: InvitableRole!) {
  createInvitation(workspaceId: $workspaceId, email: $email, role: $role) { id }
}`;
// The role written into the operation, since `owner` is no value of the
// variable's enum: what a hand-made request naming it would send.
const CREATE_OWNER_INVITATION = `mutation ($workspaceId: ID!, $email: String!) {
  createInvitation(workspaceId: $workspaceId, email: $email, role: owner) { id }
}`;
const REVOKE_INVITATION = `mutation ($workspaceId: ID!, $id: ID!) {
  revokeInvitation(workspaceId: $workspaceId, id: $id) { id }
}`;
const ACCEPT_INVITATION = `mutation ($token: String!) {
  acceptInvitation(token: $token) { id }
}`;
const ACCEPT_INVITATION_BY_ID = `mutation ($id: ID!) {
  acceptInvitationById(id: $id) { id }
}`;

/** The invitation's id, which no page shows to anyone but an owner's controls. */
async function invitationIdFor(email: string): Promise<string> {
  const [row] = await withSql(
    (sql) =>
      sql`select id from invitations where email = ${email} order by created_at desc limit 1`,
  );
  return row.id as string;
}

/** The token a mailed path carries. */
const tokenOf = (path: string) => path.slice('/invite/'.length);

/** The owner sends an invitation from the coven's Invitations page through Invite and its dialog; the row lists pending. */
async function ownerInvites(page: Page, email: string, role: 'Viewer' | 'Member'): Promise<void> {
  await signInAgainAs(page, people.owner.id);
  await page.goto(`/coven/${COVEN_SLUG}/invitations`);
  await page.getByRole('main').getByRole('button', { name: 'Invite', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Email Address' }).fill(email);
  await dialog.getByRole('radio', { name: role }).check();
  await dialog.getByRole('button', { name: 'Send Invitation' }).click();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(pendingRow(page, email)).toBeVisible();
}

const pendingRow = (page: Page, email: string) =>
  page
    .getByRole('table', { name: 'Pending Invitations' })
    .getByRole('row')
    .filter({ hasText: email });

/** Waits for the Invitations tab to be open: with nothing pending there is only the empty state to wait for. */
const expectInvitationsTab = (page: Page) =>
  expect(
    page.getByRole('navigation', { name: 'Members' }).getByRole('link', { name: 'Invitations' }),
  ).toHaveAttribute('aria-current', 'page');

const rollRow = (page: Page, name: string) =>
  page.getByRole('table', { name: 'Members' }).getByRole('row').filter({ hasText: name });

/** The owner's roll: its rows, and none for `absent`, so "no seat was made" is read here. */
async function ownerReadsRoll(page: Page, absent?: string): Promise<number> {
  await signInAgainAs(page, people.owner.id);
  await page.goto(`/coven/${COVEN_SLUG}/members`);
  const table = page.getByRole('table', { name: 'Members' });
  await expect(table).toBeVisible();
  const rows = table.getByRole('row');
  if (absent) await expect(rollRow(page, absent)).toHaveCount(0);
  return rows.count();
}

/**
 * A dead link opened by a signed-in reader: the refusal shows, there is no Accept, and the coven is not named.
 * Answers the refusal's words so a caller can tell one reason from another.
 */
async function refusalAt(page: Page, path: string): Promise<string> {
  await page.goto(path);
  const refusal = page.getByRole('main').getByRole('alert');
  await expect(refusal).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accept Invitation' })).toHaveCount(0);
  await expect(page.getByRole('main')).not.toContainText(COVEN_NAME);
  return (await refusal.textContent()) ?? '';
}

/** A holder with a dead link tries Accept's request by hand: refused, no seat, and the coven is a 404 to them. */
async function directAcceptRefused(page: Page, path: string): Promise<void> {
  const answer = await sendFromPage(page, ACCEPT_INVITATION, { token: tokenOf(path) });
  expect(answer.errors?.length).toBeGreaterThan(0);
  expect((await page.goto(`/coven/${COVEN_SLUG}`))?.status()).toBe(404);
}

/**
 * Where `/coven`, the landing, sends this browser, read from its redirect. Only the navigation's own response
 * counts: the shell's brand link makes Next prefetch the landing as a 200, which could answer instead of the 307.
 */
async function landingRedirect(page: Page): Promise<string | undefined> {
  const redirected = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/coven' && response.request().isNavigationRequest(),
  );
  await page.goto('/coven').catch(() => {});
  const response = await redirected;
  expect(response.status()).toBe(307);
  return response.headers().location;
}

test.beforeAll(async ({ browser }) => {
  await recreateE2eDatabase();
  // `signInAs` writes the rows and holds the cookie on a page; this one only
  // makes the people, and every test signs in again on its own.
  const page = await browser.newPage();
  try {
    people.owner = await signInNamed(page, address('owner'), 'Fixture Owner');
    people.member = await signInNamed(page, address('member'), 'Fixture Member');
    people.viewer = await signInNamed(page, address('viewer'), 'Fixture Viewer');
  } finally {
    await page.close();
  }
  await withSql(async (sql) => {
    const [coven] = await sql`
      insert into workspaces (name, slug, created_by, updated_by)
      values (${COVEN_NAME}, ${COVEN_SLUG}, ${people.owner.id}, ${people.owner.id})
      returning id`;
    covenId = coven.id as string;
    for (const role of ['owner', 'member', 'viewer'] as const) {
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${covenId}, ${people[role].id}, ${role}, ${people.owner.id}, ${people.owner.id})`;
    }
  });
});

test(
  'an owner invites an address as a member from the Invitations page, offered viewer and member only, and the link goes to that address alone',
  { tag: '@story-4' },
  async ({ page }) => {
    // Invite is on the roll's tab too; the owner goes on to the Invitations tab.
    await signInAgainAs(page, people.owner.id);
    await page.goto(`/coven/${COVEN_SLUG}/members`);
    const invite = page.getByRole('main').getByRole('button', { name: 'Invite', exact: true });
    await expect(invite).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Members' })
      .getByRole('link', { name: 'Invitations' })
      .click();
    await expectInvitationsTab(page);
    await invite.click();
    const dialog = page.getByRole('dialog');

    // The role choice is viewer or member; owner is not on offer.
    const roles = dialog.getByRole('group', { name: 'Role' }).getByRole('radio');
    await expect(roles).toHaveCount(2);
    await expect(dialog.getByRole('radio', { name: 'Viewer' })).toBeVisible();
    await expect(dialog.getByRole('radio', { name: 'Member' })).toBeVisible();
    await expect(dialog.getByRole('radio', { name: /Owner/ })).toHaveCount(0);
    await assertNoAccessibilityViolations(page);

    await dialog.getByRole('textbox', { name: 'Email Address' }).fill(invited.email);
    await dialog.getByRole('radio', { name: 'Member' }).check();
    await dialog.getByRole('button', { name: 'Send Invitation' }).click();
    const done = dialog.getByRole('button', { name: 'Done' });
    await expect(done).toBeVisible();

    // The mail went to that address alone, and the link in it is not on the
    // page that sent it.
    const message = await latestMessageTo(invited.email);
    expect(message.to).toEqual([invited.email]);
    expect(await messagesTo(people.owner.email)).toBe(0);
    invitedPath = await mailedInvitePath(invited.email);
    expect(await page.content()).not.toContain(tokenOf(invitedPath));
    await done.click();
    await expect(dialog).toHaveCount(0);

    // Listed pending, at the role chosen, with its Revoke.
    const row = pendingRow(page, invited.email);
    await expect(row).toBeVisible();
    await expect(row.getByRole('cell', { name: 'Member', exact: true })).toBeVisible();
    await expect(
      row.getByRole('button', { name: `Revoke the invitation to ${invited.email}` }),
    ).toBeVisible();
    await assertNoAccessibilityViolations(page);
    await assertNoSidewaysScroll(page, { restore: true });

    // Nor is it on the list, read again from the server.
    await page.reload();
    await expect(pendingRow(page, invited.email)).toBeVisible();
    expect(await page.content()).not.toContain(tokenOf(invitedPath));

    // Owner as a role, sent by hand past the dialog, is refused: nothing is
    // listed and nothing is mailed.
    const ownerRole = address('would-be-owner');
    const answer = await sendFromPage(page, CREATE_OWNER_INVITATION, {
      workspaceId: covenId,
      email: ownerRole,
    });
    expect(answer.errors?.length).toBeGreaterThan(0);
    await page.reload();
    await expect(pendingRow(page, invited.email)).toBeVisible();
    await expect(pendingRow(page, ownerRole)).toHaveCount(0);
    expect(await messagesTo(ownerRole)).toBe(0);
  },
);

test(
  'a member and a viewer have no Invite and no Revoke, the Invitations page is a 404 to them, and the requests sent by hand are refused',
  { tag: ['@story-4', '@story-5'] },
  async ({ page }) => {
    const pendingId = await invitationIdFor(invited.email);
    // Why either could have succeeded: the invitation is there, pending, for
    // the owner to see and revoke.
    await signInAgainAs(page, people.owner.id);
    await page.goto(`/coven/${COVEN_SLUG}/invitations`);
    await expect(
      pendingRow(page, invited.email).getByRole('button', {
        name: `Revoke the invitation to ${invited.email}`,
      }),
    ).toBeVisible();

    // A member reads the roll, with neither the Invitations tab nor Invite.
    await signInAgainAs(page, people.member.id);
    await page.goto(`/coven/${COVEN_SLUG}/members`);
    await expect(rollRow(page, people.member.name)).toBeVisible();
    // One tab is no choice, so the pill navigation is left out altogether.
    await expect(page.getByRole('navigation', { name: 'Members' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Invite', exact: true })).toHaveCount(0);
    await assertNoAccessibilityViolations(page);

    // A viewer holds a seat too: the coven page opens for them.
    await signInAgainAs(page, people.viewer.id);
    expect((await page.goto(`/coven/${COVEN_SLUG}`))?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: COVEN_NAME })).toBeVisible();

    const tried = address('tried-by-hand');
    for (const person of [people.member, people.viewer]) {
      await signInAgainAs(page, person.id);
      const response = await page.goto(`/coven/${COVEN_SLUG}/invitations`);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: /^Revoke/ })).toHaveCount(0);

      const invite = await sendFromPage(page, CREATE_INVITATION, {
        workspaceId: covenId,
        email: tried,
        role: 'viewer',
      });
      expect(invite.errors?.length).toBeGreaterThan(0);
      const revoke = await sendFromPage(page, REVOKE_INVITATION, {
        workspaceId: covenId,
        id: pendingId,
      });
      expect(revoke.errors?.length).toBeGreaterThan(0);
    }

    // Nothing changed: the owner still sees the invitation pending with its
    // Revoke, and nothing was sent to the address tried.
    await signInAgainAs(page, people.owner.id);
    await page.goto(`/coven/${COVEN_SLUG}/invitations`);
    await expect(
      pendingRow(page, invited.email).getByRole('button', {
        name: `Revoke the invitation to ${invited.email}`,
      }),
    ).toBeVisible();
    await expect(pendingRow(page, tried)).toHaveCount(0);
    expect(await messagesTo(tried)).toBe(0);
  },
);

test(
  'a signed-in account whose verified address differs is refused at the link, with no Accept and no coven named, and is offered nothing on the account page',
  { tag: '@story-4' },
  async ({ page }) => {
    const stranger = await signInNamed(page, address('stranger'), 'Fixture Stranger');
    // Verified, signed in, holding the live link: only the address is wrong.
    const [row] = await withSql(
      (sql) => sql`select email_verified from users where id = ${stranger.id}`,
    );
    expect(row.email_verified).toBe(true);
    expect(await messagesTo(stranger.email)).toBe(0);

    await refusalAt(page, invitedPath);
    await assertNoAccessibilityViolations(page);

    await directAcceptRefused(page, invitedPath);

    // Nor is it theirs on the account page, and its id sent by hand is refused.
    await page.goto('/account#account-invitations');
    const section = page.getByRole('region', { name: 'Invitations' });
    await expect(section).toBeVisible();
    await expect(
      section.getByRole('button', { name: `Accept the invitation to ${COVEN_NAME}` }),
    ).toHaveCount(0);
    const byId = await sendFromPage(page, ACCEPT_INVITATION_BY_ID, {
      id: await invitationIdFor(invited.email),
    });
    expect(byId.errors?.length).toBeGreaterThan(0);
    expect((await page.goto(`/coven/${COVEN_SLUG}`))?.status()).toBe(404);

    expect(await ownerReadsRoll(page, stranger.name)).toBe(1 + 3);
  },
);

test(
  'the invited account accepts from the link and lands in the coven at the invited role, and may now create a coven',
  { tag: ['@story-4', '@story-6'] },
  async ({ page }) => {
    Object.assign(invited, await signInNamed(page, invited.email, 'Fixture Invitee'));

    // Before: no seat — the coven is a 404 to them — and no right to create
    // one: the landing offers no Create Coven, and the create page no form.
    expect((await page.goto(`/coven/${COVEN_SLUG}`))?.status()).toBe(404);
    await page.goto('/coven');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create Coven', exact: true })).toHaveCount(0);
    await page.goto('/coven/new');
    await expect(page.getByRole('main').getByRole('status')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveCount(0);

    await page.goto(invitedPath);
    const accept = page.getByRole('button', { name: 'Accept Invitation', exact: true });
    await expect(accept).toBeVisible();
    await assertNoAccessibilityViolations(page);
    await assertNoSidewaysScroll(page, { restore: true });
    await accept.click();

    await expect(page).toHaveURL(new RegExp(`/coven/${COVEN_SLUG}$`));
    await expect(page.getByRole('heading', { level: 1, name: COVEN_NAME })).toBeVisible();
    const switcher = page.getByRole('combobox', { name: 'Coven' });
    await expect(switcher).toHaveText(COVEN_NAME);
    // A client-side landing sets the document title after the page draws.
    await expect(page).toHaveTitle(/\S/);
    await assertNoAccessibilityViolations(page);

    // A member now: the roll opens for them, with their own row at that role.
    await page.goto(`/coven/${COVEN_SLUG}/members`);
    await expect(
      rollRow(page, invited.name).getByRole('cell', { name: 'Member', exact: true }),
    ).toBeVisible();

    // The landing now goes straight into the coven. The redirect is read rather than followed, so the
    // assertion is on where the landing sends the browser.
    expect(await landingRedirect(page)).toBe(`/coven/${COVEN_SLUG}`);

    // The creation right came with it: the switcher offers Create Coven, and
    // the create page has its form.
    await page.goto(`/coven/${COVEN_SLUG}`);
    await page.getByRole('combobox', { name: 'Coven' }).click();
    await expect(page.getByRole('option', { name: COVEN_NAME, exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Create Coven', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.goto('/coven/new');
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible();
  },
);

test(
  'an accepted invitation is no longer pending, offers no Revoke, and its link is refused as used',
  { tag: ['@story-5', '@story-7'] },
  async ({ page }) => {
    const acceptedId = await invitationIdFor(invited.email);

    // The owner sees the new member on the roll, at the invited role, and the
    // invitation gone from the pending list with its Revoke.
    expect(await ownerReadsRoll(page)).toBe(1 + 4);
    await expect(rollRow(page, invited.name).getByRole('cell', { name: /^Member/ })).toBeVisible();
    await page.goto(`/coven/${COVEN_SLUG}/invitations`);
    await expectInvitationsTab(page);
    await expect(pendingRow(page, invited.email)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: `Revoke the invitation to ${invited.email}` }),
    ).toHaveCount(0);

    // The holder's link is spent.
    await signInAgainAs(page, invited.id);
    usedRefusal = await refusalAt(page, invitedPath);
    await assertNoAccessibilityViolations(page);
    await assertNoSidewaysScroll(page, { restore: true });

    // Revoke sent by hand for the accepted invitation is refused: the link
    // still gives the used reason, not the revoked one, and the seat stands.
    await signInAgainAs(page, people.owner.id);
    await page.goto(`/coven/${COVEN_SLUG}/invitations`);
    await expectInvitationsTab(page);
    const answer = await sendFromPage(page, REVOKE_INVITATION, {
      workspaceId: covenId,
      id: acceptedId,
    });
    expect(answer.errors?.length).toBeGreaterThan(0);
    await signInAgainAs(page, invited.id);
    expect(await refusalAt(page, invitedPath)).toBe(usedRefusal);
    expect((await page.goto(`/coven/${COVEN_SLUG}`))?.status()).toBe(200);
  },
);

test(
  'an owner revokes a pending invitation from the list, and its link is then refused for a reason of its own, making no seat',
  { tag: ['@story-5', '@story-7'] },
  async ({ page }) => {
    const gone = address('gone');
    await ownerInvites(page, gone, 'Member');
    const path = await mailedInvitePath(gone);

    // Revoke asks first, then the row is gone.
    await pendingRow(page, gone)
      .getByRole('button', { name: `Revoke the invitation to ${gone}` })
      .click();
    const confirm = page.getByRole('dialog');
    await expect(confirm.getByRole('button', { name: 'Revoke', exact: true })).toBeVisible();
    await assertNoAccessibilityViolations(page);
    await confirm.getByRole('button', { name: 'Revoke', exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await expect(pendingRow(page, gone)).toHaveCount(0);
    // Its Revoke went with the row: the page's heading has the focus.
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused();
    await page.reload();
    await expectInvitationsTab(page);
    await expect(pendingRow(page, gone)).toHaveCount(0);
    const before = await ownerReadsRoll(page);

    // Its holder, verified at the invited address, so only the link is at fault.
    const holder = await signInNamed(page, gone, 'Fixture Revoked');
    revokedRefusal = await refusalAt(page, path);
    expect(revokedRefusal).not.toBe(usedRefusal);
    await assertNoAccessibilityViolations(page);
    await directAcceptRefused(page, path);

    expect(await ownerReadsRoll(page, holder.name)).toBe(before);
  },
);

test(
  'an expired link is refused for a reason of its own, distinct from revoked and used, making no seat',
  { tag: '@story-7' },
  async ({ page }) => {
    const late = address('late');
    await ownerInvites(page, late, 'Member');
    const path = await mailedInvitePath(late);
    const before = await ownerReadsRoll(page);

    // Its holder, verified at the invited address: the link would be accepted
    // but for its age, and is, until the week is backdated past.
    const holder = await signInNamed(page, late, 'Fixture Late');
    await page.goto(path);
    await expect(page.getByRole('button', { name: 'Accept Invitation' })).toBeVisible();
    await withSql(
      (sql) =>
        sql`update invitations set expires_at = now() - interval '1 hour' where email = ${late}`,
    );

    // The page still open offers Accept, and its press is refused: the
    // service's sentence in a callout from Accept, which keeps the focus, and
    // a badge on Accept that brings it back once closed.
    const accept = page.getByRole('button', { name: 'Accept Invitation', exact: true });
    await accept.click();
    const callout = page.getByRole('main').getByRole('alert');
    await expect(callout).toBeVisible();
    await expect(accept).toBeFocused();
    const pressedRefusal = ((await callout.textContent()) ?? '').trim();
    await expect(accept).toHaveAccessibleDescription(`Last try failed: ${pressedRefusal}`);
    await assertNoAccessibilityViolations(page);
    await assertNoSidewaysScroll(page, { restore: true });
    await page.keyboard.press('Escape');
    await expect(callout).toHaveCount(0);
    await expect(accept).toBeFocused();
    await page.getByRole('button', { name: 'Show the error for Accept Invitation' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(pressedRefusal);

    const expiredRefusal = await refusalAt(page, path);
    expect(expiredRefusal.trim()).toBe(pressedRefusal);
    expect(new Set([expiredRefusal, revokedRefusal, usedRefusal]).size).toBe(3);
    await assertNoAccessibilityViolations(page);
    await directAcceptRefused(page, path);

    expect(await ownerReadsRoll(page, holder.name)).toBe(before);
  },
);

test(
  'the invited account accepts from the account page’s Invitations, lands in the coven as a viewer, and the mailed link is then spent',
  { tag: '@story-6' },
  async ({ page }) => {
    const email = address('by-account');
    await ownerInvites(page, email, 'Viewer');
    const path = await mailedInvitePath(email);
    const holder = await signInNamed(page, email, 'Fixture Account Invitee');

    // Before: no seat, and no right to create.
    expect((await page.goto(`/coven/${COVEN_SLUG}`))?.status()).toBe(404);
    await page.goto('/coven/new');
    await expect(page.getByRole('main').getByRole('status')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveCount(0);

    // Never opening the mail: the invitation is listed on the account page.
    await page.goto('/account#account-invitations');
    const accept = page
      .getByRole('table', { name: 'Your Invitations' })
      .getByRole('button', { name: `Accept the invitation to ${COVEN_NAME}` });
    await expect(accept).toBeVisible();
    await assertNoAccessibilityViolations(page);
    expect(await page.content()).not.toContain(tokenOf(path));
    await accept.click();

    await expect(page).toHaveURL(new RegExp(`/coven/${COVEN_SLUG}$`));
    await expect(page.getByRole('heading', { level: 1, name: COVEN_NAME })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveText(COVEN_NAME);

    // The creation right came with it.
    await page.goto('/coven/new');
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible();

    // The mailed link is the same invitation, now used.
    expect(await refusalAt(page, path)).toBe(usedRefusal);

    // The owner's roll shows them, at the invited role.
    await ownerReadsRoll(page);
    await expect(rollRow(page, holder.name).getByRole('cell', { name: /^Viewer/ })).toBeVisible();
    await assertNoAccessibilityViolations(page);
  },
);
