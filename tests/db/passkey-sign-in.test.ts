import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { LAST_USED_PROVIDER_COOKIE } from '@/lib/sign-in';
import type { Message } from '@/lib/types';
import {
  ORIGIN,
  PROVIDER_CREDENTIALS,
  cookieHeader,
  signIn as signInThrough,
} from '../support/oauth';
import { importAuth } from '../support/auth-module';
import { softKey } from '../support/passkey-authenticator';
import { enrol, signInWithPasskey } from '../support/passkey';
import type { AuthInstance } from '../support/types';

// Story 73 through Better Auth's real endpoints: a key enrolled on an account
// signs that account in, and nothing else (claude-docs/auth/plugins.md, "Plugins").

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@passkey-sign-in.test';
const OWNER = `owner${DOMAIN}`;
const OTHER = `other${DOMAIN}`;

let sql: ReturnType<typeof postgres>;
let auth: AuthInstance;

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  auth = await importAuth(PROVIDER_CREDENTIALS);
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from passkeys where user_id in (${mine})`;
  await sql`delete from sign_in_failures where user_id in (${mine})`;
  await sql`delete from workspace_members where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
});

/** A verified account made through Google, and the Cookie header its session sends. */
async function account(email: string): Promise<{ id: string; session: string }> {
  const response = await signInThrough(auth, server, 'google', {
    sub: `g-${email}`,
    email,
    verified: true,
  });
  const [{ id }] = await sql<{ id: string }[]>`select id from users where email = ${email}`;
  return { id, session: cookieHeader(response) };
}

/** The user a response's session cookie signs in, read back through get-session. */
async function signedInAs(response: Response): Promise<string | undefined> {
  const session = await auth.handler(
    new Request(`${ORIGIN}/api/auth/get-session`, { headers: { cookie: cookieHeader(response) } }),
  );
  return (await session.json())?.user?.id;
}

const lastUsedOf = (response: Response) =>
  response.headers
    .getSetCookie()
    .find((header) => header.startsWith(`${LAST_USED_PROVIDER_COOKIE}=`))
    ?.split(';')[0]
    .split('=')[1];

describe('Story 73: sign in with a passkey', () => {
  it('stores the enrolled key as a passkeys row through the adapter, and reads it back to sign in', async () => {
    const owner = await account(OWNER);
    const key = softKey();

    const enrolled = await enrol(auth, owner.session, key, 'Laptop');

    expect(enrolled.status).toBe(200);
    const rows =
      await sql`select name, credential_id, user_id from passkeys where user_id = ${owner.id}`;
    expect(rows).toEqual([{ name: 'Laptop', credential_id: key.credentialId, user_id: owner.id }]);

    const signedIn = await signInWithPasskey(auth, key);
    expect(signedIn.status).toBe(200);
    expect(await signedInAs(signedIn)).toBe(owner.id);
  });

  it('marks the sign-in as made with a passkey', async () => {
    const owner = await account(OWNER);
    const key = softKey();
    await enrol(auth, owner.session, key);

    const signedIn = await signInWithPasskey(auth, key);

    expect(lastUsedOf(signedIn)).toBe('passkey');
  });

  it("signs in only the key's own account: another account's credential id with this key's signature is refused", async () => {
    const owner = await account(OWNER);
    const other = await account(OTHER);
    const ownerKey = softKey();
    const otherKey = softKey();
    await enrol(auth, owner.session, ownerKey);
    await enrol(auth, other.session, otherKey);

    // Precondition: the other account's own key signs it in.
    const theirs = await signInWithPasskey(auth, otherKey);
    expect(await signedInAs(theirs)).toBe(other.id);

    const forged = await signInWithPasskey(auth, ownerKey, { credentialId: otherKey.credentialId });

    expect(forged.ok).toBe(false);
    expect(await signedInAs(forged)).toBeUndefined();
  });

  it('refuses a key removed from the account', async () => {
    const owner = await account(OWNER);
    const key = softKey();
    await enrol(auth, owner.session, key);
    // Precondition: the key signs in while it is enrolled.
    expect(await signedInAs(await signInWithPasskey(auth, key))).toBe(owner.id);

    await sql`delete from passkeys where user_id = ${owner.id}`;
    const refused = await signInWithPasskey(auth, key);

    expect(refused.status).toBe(401);
    expect(await signedInAs(refused)).toBeUndefined();
  });

  it('earns nothing beyond what the account already holds: no workspace grant and no new seat', async () => {
    const owner = await account(OWNER);
    const key = softKey();
    await enrol(auth, owner.session, key);
    const before = await sql`
      select u.can_create_workspace, u.role,
        (select count(*)::int from workspace_members m where m.user_id = u.id) as seats
      from users u where u.id = ${owner.id}`;
    expect(before).toMatchObject([{ can_create_workspace: false, role: 'user' }]);

    const signedIn = await signInWithPasskey(auth, key);
    expect(await signedInAs(signedIn)).toBe(owner.id);

    const after = await sql`
      select u.can_create_workspace, u.role,
        (select count(*)::int from workspace_members m where m.user_id = u.id) as seats
      from users u where u.id = ${owner.id}`;
    expect(after).toEqual(before);
  });
});

describe('a passkey sign-in and the password failure count', () => {
  const failures = async (userId: string) =>
    (
      await sql<{ count: number }[]>`select count from sign_in_failures where user_id = ${userId}`
    )[0]?.count;

  it('forgets the failures once a passkey signs the account in', async () => {
    const owner = await account(OWNER);
    const key = softKey();
    await enrol(auth, owner.session, key);
    await sql`insert into sign_in_failures (user_id, count) values (${owner.id}, 3)`;
    // Precondition: the failures are on record before the sign-in.
    expect(await failures(owner.id)).toBe(3);

    const signedIn = await signInWithPasskey(auth, key);

    expect(await signedInAs(signedIn)).toBe(owner.id);
    expect(await failures(owner.id)).toBeUndefined();
  });

  it('keeps the failures when the passkey sign-in is refused', async () => {
    const owner = await account(OWNER);
    const key = softKey();
    await enrol(auth, owner.session, key);
    await sql`delete from passkeys where user_id = ${owner.id}`;
    await sql`insert into sign_in_failures (user_id, count) values (${owner.id}, 3)`;

    const refused = await signInWithPasskey(auth, key);

    expect(refused.status).toBe(401);
    expect(await failures(owner.id)).toBe(3);
  });
});
