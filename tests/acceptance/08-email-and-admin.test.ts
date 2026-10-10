import { existsSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { emailVerificationSender } from '@/lib/email-verification';
import { invitationSender } from '@/lib/invitation-mail';
import { fromRoot } from '../support/paths';
import {
  EMAIL_PAGE,
  ORIGIN,
  cookieHeader,
  expectSignedIn,
  landingOf,
  signIn as signInThrough,
  PROVIDER_CREDENTIALS,
} from '../support/oauth';
import type { Message, ProviderId } from '@/lib/types';
import { importAuth } from '../support/auth-module';
import type { AuthInstance, Profile } from '../support/types';
import { Forbidden } from '@/lib/errors';
import { resolvePage } from '@/lib/pagination';
import {
  acceptInvitation,
  createAdminInvitation,
  grantWorkspaceCreation,
  invitationStanding,
  listPrivilegeChanges,
  pauseAdminRoleChanges,
  resumeAdminRoleChanges,
  revokeAdminInvitation,
  revokeWorkspaceCreation,
  setUserRole,
  usersForAdmin,
} from '@/modules/identity';
import { A, E, asUser } from '../support/as-user';

// Stories 58 and 59 through Better Auth's real endpoints, with MSW standing in
// for the provider and the transport mocked (claude-docs/auth/admin-bootstrap.md, "First-party
// verification" and "The email page"). Story 60 through the identity
// service (MB.59, MB.63). Story 61, the privilege ledger, reads it through the
// identity service MB.199 built and MB.200's page calls. Story 62, MB.70's,
// through the identity service, its accounts made by real sign-ins.

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@acceptance-email.test';
const OWNER = `owner${DOMAIN}`;
const NEW = `new${DOMAIN}`;

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let auth: AuthInstance;

// Provider credentials and nothing else, so one import serves every test.
beforeAll(async () => {
  auth = await importAuth(PROVIDER_CREDENTIALS);
});

beforeEach(async () => {
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;

  send.mockReset();
});

const signIn = (provider: ProviderId, profile: Profile) =>
  signInThrough(auth, server, provider, profile);

async function userRow(email: string) {
  const [row] = await sql`
    select id, email, email_verified from users where email = ${email} and deleted_at is null
  `;
  return row as { id: string; email: string; email_verified: boolean } | undefined;
}

/** The link in the one mail sent since the last reset. */
function mailedLink(): string {
  expect(send).toHaveBeenCalledTimes(1);
  const link = send.mock.calls[0][0].text.match(/https?:\/\/\S+\/verify-email\?[^\s\]]+/)?.[0];
  if (!link) throw new Error('no verification link in the mail');
  return link;
}

function follow(link: string, cookie?: string): Promise<Response> {
  return auth.handler(new Request(link, { headers: cookie ? { cookie } : {} }));
}

describe('Story 58: Prove I own my email address, whichever provider I signed in with, so the site can trust it.', () => {
  it('mails a link at sign-up through a provider that does not vouch, and following it from that session verifies the address', async () => {
    const response = await signIn('microsoft', { sub: 'ms-58', email: OWNER, verified: true });
    expectSignedIn(response);
    expect(await userRow(OWNER)).toMatchObject({ email_verified: false });
    expect(send.mock.calls[0][0]).toMatchObject({ to: OWNER });

    await follow(mailedLink(), cookieHeader(response));

    expect(await userRow(OWNER)).toMatchObject({ email_verified: true });
  });

  it('refuses the link from a browser not signed in to that account', async () => {
    const response = await signIn('microsoft', { sub: 'ms-58b', email: OWNER, verified: true });
    expectSignedIn(response);

    const refused = await follow(mailedLink());

    // Signed out entirely: to sign in, with nothing from the link in the URL.
    expect(landingOf(refused)).toBe('/sign-in?next=%2Faccount%2Femail&error=sign_in_to_verify');
    expect(await userRow(OWNER)).toMatchObject({ email_verified: false });
  });
});

describe('Story 59: Set or change the email the site knows me by, prefilled from my provider, and have it take effect only once I have proved it is mine.', () => {
  it('has the email page at /account/email, where an unverified sign-in lands', async () => {
    expect(existsSync(fromRoot('src/app/account/email/page.tsx'))).toBe(true);

    const response = await signIn('microsoft', { sub: 'ms-59', email: OWNER, verified: true });

    expect(landingOf(response)).toBe(EMAIL_PAGE);
  });

  it('takes effect only once the mailed link is followed from my session: the row keeps its address until then', async () => {
    const response = await signIn('microsoft', { sub: 'ms-59b', email: OWNER, verified: true });
    expectSignedIn(response);
    const cookie = cookieHeader(response);
    const { id } = (await userRow(OWNER))!;
    send.mockReset();

    const request = new Request(`${ORIGIN}/api/graphql`, { method: 'POST', headers: { cookie } });
    await emailVerificationSender(request).requestChange(OWNER, NEW);

    expect(send.mock.calls[0][0]).toMatchObject({ to: NEW });
    expect(await userRow(OWNER)).toMatchObject({ id, email_verified: false });
    expect(await userRow(NEW)).toBeUndefined();

    await follow(mailedLink(), cookie);

    expect(await userRow(OWNER)).toBeUndefined();
    expect(await userRow(NEW)).toMatchObject({ id, email_verified: true });
  });
});

describe('Story 60: As an admin, make an existing user an admin and revoke it again, and be refused when the target is the primary admin or the last admin; as the primary admin, pause both for every other admin while I deal with one that has gone rogue.', () => {
  const ROLE_DOMAIN = '@acceptance-admin-role.test';
  const PRIMARY = `primary${ROLE_DOMAIN}`;

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  /** A live, verified user on this story's domain, an admin declared as a `psql` fix declares one. */
  async function insertUser(local: string, role: 'user' | 'admin'): Promise<string> {
    const [row] = await sql.begin(async (tx) => {
      await tx`select set_config('app.privilege_route', 'manual', true)`;
      return tx`
        insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
        values (gen_random_uuid(), 'Fixture Person', ${`${local}${ROLE_DOMAIN}`}, true, ${role}, ${role === 'admin'},
          ${E.id}, ${E.id})
        returning id
      `;
    });
    return row.id as string;
  }

  async function roleOf(id: string): Promise<string> {
    const [row] = await sql`select role::text from users where id = ${id}`;
    return row.role as string;
  }

  beforeEach(async () => {
    // E as the seed made it, put back as a `psql` fix would, its own stamp
    // first, so the users an earlier test made can go.
    await sql.begin(async (tx) => {
      await tx`select set_config('app.privilege_route', 'manual', true)`;
      await tx`
        update users set role = 'admin', can_create_workspace = true, updated_by = ${E.id}
        where id = ${E.id}
      `;
    });
    await sql`truncate user_privilege_changes`;
    await sql`truncate admin_role_change_pauses`;
    await sql`delete from users where email like ${`%${ROLE_DOMAIN}`}`;
  });

  it('makes a user an admin and revokes it again, each recorded in the ledger as the admin’s act', async () => {
    const admin = await insertUser('admin', 'admin');
    const user = await insertUser('user', 'user');
    const session = { userId: admin, role: 'admin' as const };

    await setUserRole(session, user, 'admin', 'Curates the deities');
    expect(await roleOf(user)).toBe('admin');
    await setUserRole(session, user, 'user');
    expect(await roleOf(user)).toBe('user');

    const ledger = await sql`
      select privilege::text, change::text, via::text, created_by from user_privilege_changes
      where user_id = ${user} order by created_at, privilege
    `;
    expect(ledger).toEqual([
      { privilege: 'admin', change: 'grant', via: 'admin', created_by: admin },
      { privilege: 'create_workspace', change: 'grant', via: 'admin', created_by: admin },
      { privilege: 'admin', change: 'revoke', via: 'admin', created_by: admin },
    ]);
  });

  it('refuses revoking the primary admin, whom another admin could otherwise revoke', async () => {
    const admin = await insertUser('admin', 'admin');
    const primary = await insertUser('primary', 'admin');
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', PRIMARY);

    await expect(setUserRole({ userId: admin, role: 'admin' }, primary, 'user')).rejects.toThrow(
      "This is the primary admin and can't be removed.",
    );
    expect(await roleOf(primary)).toBe('admin');

    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', `someone-else${ROLE_DOMAIN}`);
    await setUserRole({ userId: admin, role: 'admin' }, primary, 'user');
    expect(await roleOf(primary)).toBe('user');
  });

  it('refuses revoking the last admin, with no primary admin in place', async () => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', `nobody${ROLE_DOMAIN}`);
    // The seed's admin, E, is the other live admin; with it revoked, one is left.
    const admin = await insertUser('admin', 'admin');
    await setUserRole({ userId: admin, role: 'admin' }, E.id, 'user');
    const [{ count }] = await sql`
      select count(*)::int as count from users where role = 'admin' and deleted_at is null
    `;
    expect(count).toBe(1);

    await expect(setUserRole({ userId: admin, role: 'admin' }, admin, 'user')).rejects.toThrow(
      'the last admin',
    );
    expect(await roleOf(admin)).toBe('admin');
  });

  it('lets the primary admin pause grants and revokes for every other admin, itself exempt, and resume them', async () => {
    const admin = await insertUser('admin', 'admin');
    const primary = await insertUser('primary', 'admin');
    const user = await insertUser('user', 'user');
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', PRIMARY);
    const asAdmin = { userId: admin, role: 'admin' as const };
    const asPrimary = { userId: primary, role: 'admin' as const };

    await expect(pauseAdminRoleChanges(asAdmin)).rejects.toThrow('Only the primary admin');
    await pauseAdminRoleChanges(asPrimary);

    await expect(setUserRole(asAdmin, user, 'admin')).rejects.toThrow('Admin changes are paused');
    await expect(setUserRole(asAdmin, E.id, 'user')).rejects.toThrow('Admin changes are paused');
    expect(await roleOf(user)).toBe('user');
    await setUserRole(asPrimary, user, 'admin');
    expect(await roleOf(user)).toBe('admin');

    await resumeAdminRoleChanges(asPrimary);
    await setUserRole(asAdmin, user, 'user');
    expect(await roleOf(user)).toBe('user');
  });
});

describe('Story 61: As an admin, see every change to who is an admin and who may create a coven, with who made it, how, when and why, so that misuse comes to light.', () => {
  // Its own domain: the ledger cannot be deleted from, so its subject must
  // outlive the file's per-test cleanup of the email stories' users.
  const SUBJECT = '00000000-0000-0000-0000-0000000006a1';

  beforeAll(async () => {
    await sql`
      insert into users (id, name, email, created_by, updated_by)
      values (${SUBJECT}, 'Ledger Fixturewort', 'subject@acceptance-ledger.test', ${SUBJECT}, ${SUBJECT})
    `;
  });

  const ledgerOf = (userId?: string) =>
    resolvePage({ first: 25 }, (request) => listPrivilegeChanges(asUser(E), { userId }, request));

  it('records an approval and its revoke, newest first, with who, how, when and why', async () => {
    const before = new Date();
    await grantWorkspaceCreation(asUser(E), SUBJECT);
    await revokeWorkspaceCreation(asUser(E), SUBJECT);
    // A break-glass fix, which must say it is one, and may say why, stamped
    // with whoever ran it.
    await sql.begin(async (tx) => {
      await tx`select set_config('app.privilege_route', 'manual', true),
                      set_config('app.privilege_note', 'Restored after the audit', true)`;
      await tx`update users set can_create_workspace = true, updated_by = ${A.id} where id = ${SUBJECT}`;
    });

    const { edges } = await ledgerOf(SUBJECT);

    expect(
      edges.map(({ node }) => [node.privilege, node.change, node.via, node.createdBy, node.note]),
    ).toEqual([
      ['create_workspace', 'grant', 'manual', A.id, 'Restored after the audit'],
      ['create_workspace', 'revoke', 'admin', E.id, null],
      ['create_workspace', 'grant', 'admin', E.id, null],
    ]);
    for (const { node } of edges) {
      expect(node.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    }
    const [subject, actor] = await usersForAdmin(asUser(E), [SUBJECT, E.id]);
    expect(subject).toMatchObject({ name: 'Ledger Fixturewort' });
    expect(actor).toMatchObject({ id: E.id });
  });

  it('shows every user’s changes unfiltered, this subject’s among them', async () => {
    const { edges } = await ledgerOf();

    expect(edges.length).toBeGreaterThan(3);
    expect(edges.filter(({ node }) => node.userId === SUBJECT)).toHaveLength(3);
  });

  it('is refused to anyone but an admin', async () => {
    expect(asUser(A).role).toBe('user');
    expect((await ledgerOf(SUBJECT)).edges.length).toBeGreaterThan(0);

    await expect(
      listPrivilegeChanges(asUser(A), { userId: SUBJECT }, { limit: 26, inverted: false }),
    ).rejects.toThrow(Forbidden);
  });
});

describe('Story 62: As an admin, invite someone by email to become an admin, accepted only by an account that has proved it owns that address.', () => {
  // On the email stories' domain, so the file's cleanup takes the accounts
  // these sign-ins make; the rows naming them go first.
  const INVITED = `invited${DOMAIN}`;
  const OTHER = `other${DOMAIN}`;

  const sender = () => invitationSender(new Request(`${ORIGIN}/api/graphql`, { method: 'POST' }));

  /** The token in the invitation mailed since the last reset: the inbox is the only place it is. */
  function mailedInvitationToken(): string {
    const mail = send.mock.calls.map(([message]) => message).find((m) => m.to === INVITED);
    const token = mail?.text.match(new RegExp(`${ORIGIN}/invite/([A-Za-z0-9_-]+)`))?.[1];
    if (!token) throw new Error('no invitation link was mailed');
    return token;
  }

  async function invite(note?: string): Promise<string> {
    await createAdminInvitation(asUser(E), INVITED, note, sender());
    const token = mailedInvitationToken();
    send.mockReset();
    return token;
  }

  async function sessionOf(email: string) {
    const row = await userRow(email);
    if (!row) throw new Error(`no account at ${email}`);
    return { userId: row.id, role: 'user' as const };
  }

  beforeEach(async () => {
    await sql.begin(async (tx) => {
      await tx`select set_config('app.privilege_route', 'manual', true)`;
      await tx`update users set role = 'admin', can_create_workspace = true where id = ${E.id}`;
    });
    await sql`truncate admin_role_change_pauses`;
  });

  afterEach(async () => {
    await sql`truncate invitations`;
    await sql`truncate user_privilege_changes`;
  });

  it('mails the link to the invited address, and keeps only its hash', async () => {
    const invitation = await createAdminInvitation(asUser(E), INVITED, undefined, sender());

    const token = mailedInvitationToken();
    expect(send.mock.calls.map(([message]) => message.to)).toEqual([INVITED]);
    expect(JSON.stringify(invitation)).not.toContain(token);
    const rows = await sql`select token_hash from invitations`;
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).not.toBe(token);
  });

  it('is refused to anyone but an admin', async () => {
    expect(asUser(A).role).toBe('user');

    await expect(createAdminInvitation(asUser(A), INVITED, undefined, sender())).rejects.toThrow(
      Forbidden,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses the invited account until it has proved the address, then makes it an admin, recorded as accepting the invitation', async () => {
    const token = await invite('Curates the resins');
    const response = await signIn('microsoft', { sub: 'ms-62', email: INVITED, verified: true });
    expectSignedIn(response);
    const session = await sessionOf(INVITED);

    expect(await invitationStanding(session, token)).toMatchObject({ reason: 'unverified' });
    await expect(acceptInvitation(session, token)).rejects.toThrow(Forbidden);

    await follow(mailedLink(), cookieHeader(response));
    await acceptInvitation(session, token);

    const [user] = await sql`
      select role::text, can_create_workspace from users where id = ${session.userId}
    `;
    expect(user).toEqual({ role: 'admin', can_create_workspace: true });
    const ledger = await sql`
      select privilege::text, via::text, note, created_by from user_privilege_changes
      where user_id = ${session.userId} order by privilege
    `;
    expect(ledger).toEqual([
      {
        privilege: 'admin',
        via: 'invitation',
        note: 'Curates the resins',
        created_by: session.userId,
      },
      {
        privilege: 'create_workspace',
        via: 'invitation',
        note: 'Curates the resins',
        created_by: session.userId,
      },
    ]);
  });

  it('refuses an account that has proved a different address', async () => {
    const token = await invite();
    expectSignedIn(await signIn('google', { sub: 'g-62', email: OTHER, verified: true }));
    const session = await sessionOf(OTHER);
    expect(await userRow(OTHER)).toMatchObject({ email_verified: true });

    await expect(acceptInvitation(session, token)).rejects.toThrow(/different email address/);
    const [user] = await sql`select role::text from users where id = ${session.userId}`;
    expect(user.role).toBe('user');
  });

  it('refuses a link that has been used, withdrawn or has run out, each in words of its own', async () => {
    // All three first: once one is accepted, the address is an admin's.
    const withdrawn = await invite();
    const lapsed = await invite();
    const used = await invite();
    const [first, second] = await sql`select id from invitations order by created_at`;
    await revokeAdminInvitation(asUser(E), first.id);
    await sql`update invitations set expires_at = now() - interval '1 second' where id = ${second.id}`;
    expectSignedIn(await signIn('google', { sub: 'g-62b', email: INVITED, verified: true }));
    const session = await sessionOf(INVITED);
    await acceptInvitation(session, used);

    const messages = await Promise.all(
      [used, withdrawn, lapsed].map((token) =>
        acceptInvitation(session, token).then(
          () => 'accepted',
          (error: Error) => error.message,
        ),
      ),
    );
    expect(messages).toEqual([
      'This invitation has already been accepted.',
      'This invitation was withdrawn. Ask whoever sent it for a new one.',
      'This invitation has expired. Ask whoever sent it for a new one.',
    ]);
  });
});
