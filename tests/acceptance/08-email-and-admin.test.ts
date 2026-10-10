import { existsSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { emailVerificationSender } from '@/lib/email-verification';
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
  grantWorkspaceCreation,
  listPrivilegeChanges,
  revokeWorkspaceCreation,
  setUserRole,
  usersForAdmin,
} from '@/modules/identity';
import { A, E, asUser } from '../support/as-user';

// Stories 58 and 59 through Better Auth's real endpoints, with MSW standing in
// for the provider and the transport mocked (claude-docs/auth/admin-bootstrap.md, "First-party
// verification" and "The email page"). Story 60 through the identity
// service (MB.59, MB.63). Story 61, the privilege ledger, reads it through the
// identity service MB.199 built and MB.200's page calls. Story 62 is MB.70's,
// and has no test yet.

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
    await sql`truncate user_privilege_changes`;
    await sql`delete from users where email like ${`%${ROLE_DOMAIN}`}`;
    // E as the seed made it, put back as a `psql` fix would.
    await sql.begin(async (tx) => {
      await tx`select set_config('app.privilege_route', 'manual', true)`;
      await tx`update users set role = 'admin', can_create_workspace = true where id = ${E.id}`;
    });
    await sql`truncate user_privilege_changes`;
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
