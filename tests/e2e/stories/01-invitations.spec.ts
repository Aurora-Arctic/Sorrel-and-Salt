import { createHash, randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from '../axe';
import { recreateE2eDatabase, withE2eSql } from '../database';
import { graphqlFromPage } from '../graphql';
import { sendInvitationFromDialog, refusalAt as sharedRefusalAt } from '../invitations';
import { countMessagesTo, latestMessageTo, mailedInvitePath } from '../mailpit';
import { signInAgainAs, signInAs } from '../session';
import { newToken } from '@/lib/invitation-token';
import { slugify } from '@/lib/slugify';
import { insertWorkspace } from '../../support/db/insert-workspace';

// A refusal is proved twice: the control is absent, and the same request by hand to `/api/graphql` is refused too.
// Serial, as every test shares the one coven and its roll counts are read before and after.
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

/** `signInAs` names everyone alike. */
async function signInNamed(page: Page, email: string, name: string): Promise<Person> {
  const { userId } = await signInAs(page, email);
  await withE2eSql((sql) => sql`update users set name = ${name} where id = ${userId}`);
  return { id: userId, name, email };
}

const CREATE_INVITATION = `mutation ($workspaceId: ID!, $email: String!, $role: InvitableRole!) {
  createInvitation(workspaceId: $workspaceId, email: $email, role: $role) { id }
}`;
// `owner` is no value of the variable's enum: what a hand-made request naming it would send.
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

type InvitationState = 'pending' | 'accepted' | 'revoked' | 'expired';

/** A precondition, never the step a story proves. An accepted one only stamps the row; the seat is its own insert. */
async function seedInvitation(
  email: string,
  role: 'viewer' | 'member',
  state: InvitationState = 'pending',
): Promise<{ id: string; path: string }> {
  const token = newToken();
  const owner = people.owner.id;
  const [row] = await withE2eSql(
    (sql) => sql`
      insert into invitations (email, token_hash, workspace_id, role, created_by, updated_by,
        expires_at, revoked_at, accepted_at, accepted_by)
      values (${email}, ${createHash('sha256').update(token).digest('hex')}, ${covenId}, ${role}, ${owner},
        ${owner},
        ${state === 'expired' ? sql`now() - interval '1 hour'` : sql`now() + interval '7 days'`},
        ${state === 'revoked' ? sql`now()` : null}, ${state === 'accepted' ? sql`now()` : null},
        ${state === 'accepted' ? owner : null})
      returning id`,
  );
  return { id: row.id as string, path: `/invite/${token}` };
}

async function deadLinkRefusal(page: Page, email: string, state: InvitationState): Promise<string> {
  const { path } = await seedInvitation(email, 'member', state);
  return refusalAt(page, path);
}

/** No page shows it to anyone but an owner's controls. */
async function invitationIdFor(email: string): Promise<string> {
  const [row] = await withE2eSql(
    (sql) =>
      sql`select id from invitations where email = ${email} order by created_at desc limit 1`,
  );
  return row.id as string;
}

const tokenOf = (path: string) => path.slice('/invite/'.length);

async function ownerInvites(
  page: Page,
  email: string,
  role: 'Observer' | 'Practitioner',
): Promise<void> {
  await signInAgainAs(page, people.owner.id);
  await page.goto(`/coven/${COVEN_SLUG}/invitations`);
  await sendInvitationFromDialog(page, email, role);
  await expect(pendingRow(page, email)).toBeVisible();
}

const pendingRow = (page: Page, email: string) =>
  page
    .getByRole('table', { name: 'Pending Invitations' })
    .getByRole('row')
    .filter({ hasText: email });

/** With nothing pending there is only the empty state to wait for. */
const expectInvitationsTab = (page: Page) =>
  expect(
    page.getByRole('navigation', { name: 'Members' }).getByRole('link', { name: 'Invitations' }),
  ).toHaveAttribute('aria-current', 'page');

const rollRow = (page: Page, name: string) =>
  page.getByRole('table', { name: 'Members' }).getByRole('row').filter({ hasText: name });

/** None for `absent`: "no seat was made" is read here. */
async function ownerReadsRoll(page: Page, absent?: string): Promise<number> {
  await signInAgainAs(page, people.owner.id);
  await page.goto(`/coven/${COVEN_SLUG}/members`);
  const table = page.getByRole('table', { name: 'Members' });
  await expect(table).toBeVisible();
  const rows = table.getByRole('row');
  if (absent) await expect(rollRow(page, absent)).toHaveCount(0);
  return rows.count();
}

const refusalAt = (page: Page, path: string) => sharedRefusalAt(page, path, COVEN_NAME);

async function directAcceptRefused(page: Page, path: string): Promise<void> {
  const answer = await graphqlFromPage(page, ACCEPT_INVITATION, { token: tokenOf(path) });
  expect(answer.errors?.length).toBeGreaterThan(0);
  expect((await page.goto(`/coven/${COVEN_SLUG}`))?.status()).toBe(404);
}

/** Only the navigation's own response counts: the brand link makes Next prefetch the landing as a 200, which could answer instead of the 307. */
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
  // Only makes the people; every test signs in again on its own.
  const page = await browser.newPage();
  try {
    people.owner = await signInNamed(page, address('owner'), 'Fixture Owner');
    people.member = await signInNamed(page, address('member'), 'Fixture Member');
    people.viewer = await signInNamed(page, address('viewer'), 'Fixture Viewer');
  } finally {
    await page.close();
  }
  await withE2eSql(async (sql) => {
    covenId = await insertWorkspace(
      sql,
      COVEN_NAME,
      (['owner', 'member', 'viewer'] as const).map((role) => [people[role].id, role] as const),
      { slug: COVEN_SLUG, author: people.owner.id },
    );
  });
});

test(
  'an owner invites an address as a member from the Invitations page, offered viewer and member only, and the link goes to that address alone',
  { tag: '@story-4' },
  async ({ page }) => {
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

    const roles = dialog.getByRole('group', { name: 'Role' }).getByRole('radio');
    await expect(roles).toHaveCount(2);
    await expect(dialog.getByRole('radio', { name: 'Observer' })).toBeVisible();
    await expect(dialog.getByRole('radio', { name: 'Practitioner' })).toBeVisible();
    await expect(dialog.getByRole('radio', { name: /Steward/ })).toHaveCount(0);
    // Sweep gap: the page state reached in "an owner invites an address as a member from the Invitations page, offered viewe", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page);

    const invited = address('invited-by-dialog');
    await dialog.getByRole('textbox', { name: 'Email Address' }).fill(invited);
    await dialog.getByRole('radio', { name: 'Practitioner' }).check();
    await dialog.getByRole('button', { name: 'Send Invitation' }).click();
    const done = dialog.getByRole('button', { name: 'Done' });
    await expect(done).toBeVisible();

    const message = await latestMessageTo(invited);
    expect(message.to).toEqual([invited]);
    expect(await countMessagesTo(people.owner.email)).toBe(0);
    const invitedPath = await mailedInvitePath(invited);
    expect(await page.content()).not.toContain(tokenOf(invitedPath));
    await done.click();
    await expect(dialog).toHaveCount(0);

    const row = pendingRow(page, invited);
    await expect(row).toBeVisible();
    await expect(row.getByRole('cell', { name: 'Practitioner', exact: true })).toBeVisible();
    await expect(
      row.getByRole('button', { name: `Revoke the invitation to ${invited}` }),
    ).toBeVisible();
    // Sweep gap: the page state reached in "an owner invites an address as a member from the Invitations page, offered viewe", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page);
    await assertNoSidewaysScroll(page, { restore: true });

    await page.reload();
    await expect(pendingRow(page, invited)).toBeVisible();
    expect(await page.content()).not.toContain(tokenOf(invitedPath));

    const ownerRole = address('would-be-owner');
    const answer = await graphqlFromPage(page, CREATE_OWNER_INVITATION, {
      workspaceId: covenId,
      email: ownerRole,
    });
    expect(answer.errors?.length).toBeGreaterThan(0);
    await page.reload();
    await expect(pendingRow(page, invited)).toBeVisible();
    await expect(pendingRow(page, ownerRole)).toHaveCount(0);
    expect(await countMessagesTo(ownerRole)).toBe(0);
  },
);

test(
  'a member and a viewer have no Invite and no Revoke, the Invitations page is a 404 to them, and the requests sent by hand are refused',
  { tag: ['@story-4', '@story-5'] },
  async ({ page }) => {
    const invited = { email: address('pending-for-members') };
    const { id: pendingId } = await seedInvitation(invited.email, 'member');
    // Why either could have succeeded: the invitation is there, pending, for
    // the owner to see and revoke.
    await signInAgainAs(page, people.owner.id);
    await page.goto(`/coven/${COVEN_SLUG}/invitations`);
    await expect(
      pendingRow(page, invited.email).getByRole('button', {
        name: `Revoke the invitation to ${invited.email}`,
      }),
    ).toBeVisible();

    await signInAgainAs(page, people.member.id);
    await page.goto(`/coven/${COVEN_SLUG}/members`);
    await expect(rollRow(page, people.member.name)).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Members' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Invite', exact: true })).toHaveCount(0);
    // Sweep gap: the page state reached in "a member and a viewer have no Invite and no Revoke, the Invitations page is a 40", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page);

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

      const invite = await graphqlFromPage(page, CREATE_INVITATION, {
        workspaceId: covenId,
        email: tried,
        role: 'viewer',
      });
      expect(invite.errors?.length).toBeGreaterThan(0);
      const revoke = await graphqlFromPage(page, REVOKE_INVITATION, {
        workspaceId: covenId,
        id: pendingId,
      });
      expect(revoke.errors?.length).toBeGreaterThan(0);
    }

    await signInAgainAs(page, people.owner.id);
    await page.goto(`/coven/${COVEN_SLUG}/invitations`);
    await expect(
      pendingRow(page, invited.email).getByRole('button', {
        name: `Revoke the invitation to ${invited.email}`,
      }),
    ).toBeVisible();
    await expect(pendingRow(page, tried)).toHaveCount(0);
    expect(await countMessagesTo(tried)).toBe(0);
  },
);

test(
  'a signed-in account whose verified address differs is refused at the link, with no Accept and no coven named, and is offered nothing on the account page',
  { tag: '@story-4' },
  async ({ page }) => {
    const invited = { email: address('pending-for-stranger') };
    const { path: invitedPath } = await seedInvitation(invited.email, 'member');
    const before = await ownerReadsRoll(page);
    const stranger = await signInNamed(page, address('stranger'), 'Fixture Stranger');
    // Verified, signed in, holding the live link: only the address is wrong.
    const [row] = await withE2eSql(
      (sql) => sql`select email_verified from users where id = ${stranger.id}`,
    );
    expect(row.email_verified).toBe(true);
    expect(await countMessagesTo(stranger.email)).toBe(0);

    await refusalAt(page, invitedPath);
    // Sweep gap: the page state reached in "a signed-in account whose verified address differs is refused at the link, with ", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page);

    await directAcceptRefused(page, invitedPath);

    await page.goto('/account#account-invitations');
    const section = page.getByRole('region', { name: 'Invitations' });
    await expect(section).toBeVisible();
    await expect(
      section.getByRole('button', { name: `Accept the invitation to ${COVEN_NAME}` }),
    ).toHaveCount(0);
    const byId = await graphqlFromPage(page, ACCEPT_INVITATION_BY_ID, {
      id: await invitationIdFor(invited.email),
    });
    expect(byId.errors?.length).toBeGreaterThan(0);
    expect((await page.goto(`/coven/${COVEN_SLUG}`))?.status()).toBe(404);

    expect(await ownerReadsRoll(page, stranger.name)).toBe(before);
  },
);

test(
  'the invited account accepts from the link and lands in the coven at the invited role, and may now create a coven',
  { tag: ['@story-4', '@story-6'] },
  async ({ page }) => {
    const invited = await signInNamed(page, address('invited'), 'Fixture Invitee');
    const { path: invitedPath } = await seedInvitation(invited.email, 'member');

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
    // Sweep gap: the page state reached in "the invited account accepts from the link and lands in the coven at the invited ", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page);
    await assertNoSidewaysScroll(page, { restore: true });
    await accept.click();

    await expect(page).toHaveURL(new RegExp(`/coven/${COVEN_SLUG}$`));
    await expect(page.getByRole('heading', { level: 1, name: COVEN_NAME })).toBeVisible();
    const switcher = page.getByRole('combobox', { name: 'Coven' });
    await expect(switcher).toHaveText(COVEN_NAME);
    // A client-side landing sets the document title after the page draws.
    await expect(page).toHaveTitle(/\S/);
    // Sweep gap: the page state reached in "the invited account accepts from the link and lands in the coven at the invited ", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page);

    await page.goto(`/coven/${COVEN_SLUG}/members`);
    await expect(
      rollRow(page, invited.name).getByRole('button', { name: 'About Practitioner', exact: true }),
    ).toBeVisible();

    // The redirect is read rather than followed.
    expect(await landingRedirect(page)).toBe(`/coven/${COVEN_SLUG}`);

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
    const invited = await signInNamed(page, address('accepted'), 'Fixture Accepted');
    const { id: acceptedId, path: invitedPath } = await seedInvitation(
      invited.email,
      'member',
      'accepted',
    );
    await withE2eSql(
      (sql) => sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${covenId}, ${invited.id}, 'member', ${people.owner.id}, ${people.owner.id})`,
    );

    await ownerReadsRoll(page);
    await expect(
      rollRow(page, invited.name).getByRole('cell', { name: /^Practitioner/ }),
    ).toBeVisible();
    await page.goto(`/coven/${COVEN_SLUG}/invitations`);
    await expectInvitationsTab(page);
    await expect(pendingRow(page, invited.email)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: `Revoke the invitation to ${invited.email}` }),
    ).toHaveCount(0);

    await signInAgainAs(page, invited.id);
    const usedRefusal = await refusalAt(page, invitedPath);
    // Sweep gap: the page state reached in "an accepted invitation is no longer pending, offers no Revoke, and its link is r", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page);
    await assertNoSidewaysScroll(page, { restore: true });

    await signInAgainAs(page, people.owner.id);
    await page.goto(`/coven/${COVEN_SLUG}/invitations`);
    await expectInvitationsTab(page);
    const answer = await graphqlFromPage(page, REVOKE_INVITATION, {
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
    await ownerInvites(page, gone, 'Practitioner');
    const path = await mailedInvitePath(gone);

    await pendingRow(page, gone)
      .getByRole('button', { name: `Revoke the invitation to ${gone}` })
      .click();
    const confirm = page.getByRole('dialog');
    await expect(confirm.getByRole('button', { name: 'Revoke', exact: true })).toBeVisible();
    // Sweep gap: the page state reached in "an owner revokes a pending invitation from the list, and its link is then refuse", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page);
    await confirm.getByRole('button', { name: 'Revoke', exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await expect(pendingRow(page, gone)).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeFocused();
    await page.reload();
    await expectInvitationsTab(page);
    await expect(pendingRow(page, gone)).toHaveCount(0);
    const before = await ownerReadsRoll(page);

    // Its holder, verified at the invited address, so only the link is at fault.
    const holder = await signInNamed(page, gone, 'Fixture Revoked');
    const revokedRefusal = await refusalAt(page, path);
    expect(revokedRefusal).not.toBe(await deadLinkRefusal(page, holder.email, 'accepted'));
    // Sweep gap: the page state reached in "an owner revokes a pending invitation from the list, and its link is then refuse", which no sweep route or modal opens.
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
    await ownerInvites(page, late, 'Practitioner');
    const path = await mailedInvitePath(late);
    const before = await ownerReadsRoll(page);

    // The link would be accepted but for its age, until the week is backdated past.
    const holder = await signInNamed(page, late, 'Fixture Late');
    await page.goto(path);
    await expect(page.getByRole('button', { name: 'Accept Invitation' })).toBeVisible();
    await withE2eSql(
      (sql) =>
        sql`update invitations set expires_at = now() - interval '1 hour' where email = ${late}`,
    );

    const accept = page.getByRole('button', { name: 'Accept Invitation', exact: true });
    await accept.click();
    const callout = page.getByRole('main').getByRole('alert');
    await expect(callout).toBeVisible();
    await expect(accept).toBeFocused();
    const pressedRefusal = ((await callout.textContent()) ?? '').trim();
    await expect(accept).toHaveAccessibleDescription(`Last try failed: ${pressedRefusal}`);
    // Sweep gap: the page state reached in "an expired link is refused for a reason of its own, distinct from revoked and us", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page);
    await assertNoSidewaysScroll(page, { restore: true });
    await page.keyboard.press('Escape');
    await expect(callout).toHaveCount(0);
    await expect(accept).toBeFocused();
    await page.getByRole('button', { name: 'Show the error for Accept Invitation' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(pressedRefusal);

    const expiredRefusal = await refusalAt(page, path);
    expect(expiredRefusal.trim()).toBe(pressedRefusal);
    const revokedRefusal = await deadLinkRefusal(page, holder.email, 'revoked');
    const usedRefusal = await deadLinkRefusal(page, holder.email, 'accepted');
    expect(new Set([expiredRefusal, revokedRefusal, usedRefusal]).size).toBe(3);
    // Sweep gap: the page state reached in "an expired link is refused for a reason of its own, distinct from revoked and us", which no sweep route or modal opens.
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
    await ownerInvites(page, email, 'Observer');
    const path = await mailedInvitePath(email);
    const holder = await signInNamed(page, email, 'Fixture Account Invitee');

    expect((await page.goto(`/coven/${COVEN_SLUG}`))?.status()).toBe(404);
    await page.goto('/coven/new');
    await expect(page.getByRole('main').getByRole('status')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveCount(0);

    // A badge clipped to a pixel takes no pointer, so the click fails rather than lands.
    const banner = page.getByRole('banner');
    await banner
      .getByRole('button', { name: 'Fixture Account Invitee, 1 coven invitation' })
      .click();
    await banner.getByRole('link', { name: '1 Coven Invitation' }).click();
    await expect(page).toHaveURL(/\/account#account-invitations$/);
    const accept = page
      .getByRole('table', { name: 'Your Invitations' })
      .getByRole('button', { name: `Accept the invitation to ${COVEN_NAME}` });
    await expect(accept).toBeVisible();
    // Sweep gap: the page state reached in "the invited account accepts from the account page’s Invitations, lands in the co", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page);
    expect(await page.content()).not.toContain(tokenOf(path));
    await accept.click();

    await expect(page).toHaveURL(new RegExp(`/coven/${COVEN_SLUG}$`));
    await expect(page.getByRole('heading', { level: 1, name: COVEN_NAME })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveText(COVEN_NAME);

    await page.goto('/coven/new');
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible();

    expect(await refusalAt(page, path)).toBe(await deadLinkRefusal(page, holder.email, 'accepted'));

    await ownerReadsRoll(page);
    await expect(rollRow(page, holder.name).getByRole('cell', { name: /^Observer/ })).toBeVisible();
    // Sweep gap: the page state reached in "the invited account accepts from the account page’s Invitations, lands in the co", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page);
  },
);
