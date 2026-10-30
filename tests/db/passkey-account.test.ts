import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import type { Message } from '@/lib/types';
import {
  ORIGIN,
  PROVIDER_CREDENTIALS,
  cookieHeader,
  signIn as signInThrough,
} from '../support/oauth';
import { importAuth } from '../support/auth-module';
import { softKey } from '../support/passkey-authenticator';
import { enrol } from '../support/passkey';
import type { AuthInstance } from '../support/types';

// Story 74 through Better Auth's real endpoints: an account renames and removes its own passkeys, no other's, and
// never the last way it has to sign in (claude-docs/auth/plugins.md, "Passkeys").

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const DOMAIN = '@passkey-account.test';
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

/** An account holding one enrolled passkey, and that passkey's id. */
async function accountWithPasskey(email: string, name = 'Laptop') {
  const holder = await account(email);
  await enrol(auth, holder.session, softKey(), name);
  const [{ id }] = await sql<
    { id: string }[]
  >`select id from passkeys where user_id = ${holder.id}`;
  return { ...holder, passkeyId: id };
}

const post = (session: string, path: string, body: object) =>
  auth.handler(
    new Request(`${ORIGIN}/api/auth/passkey/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: session, origin: ORIGIN },
      body: JSON.stringify(body),
    }),
  );

const rename = (session: string, id: string, name: string) =>
  post(session, 'update-passkey', { id, name });
const remove = (session: string, id: string) => post(session, 'delete-passkey', { id });

/** Resolves once this many other connections to the test database are waiting on a lock. */
async function waitingOnLocks(count: number): Promise<void> {
  const deadline = Date.now() + 10_000;
  for (;;) {
    const [{ waiting }] = await sql<{ waiting: number }[]>`
      select count(*)::int as waiting from pg_stat_activity
      where datname = current_database() and wait_event_type = 'Lock'
    `;
    if (waiting >= count) return;
    if (Date.now() > deadline) throw new Error(`${waiting} of ${count} connections reached a lock`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

const passkeysOf = (userId: string) =>
  sql<{ id: string; name: string }[]>`select id, name from passkeys where user_id = ${userId}`;

describe("Story 74: an account's passkeys", () => {
  it('renames and removes its own passkey', async () => {
    const owner = await accountWithPasskey(OWNER);

    expect((await rename(owner.session, owner.passkeyId, 'Phone')).status).toBe(200);
    expect(await passkeysOf(owner.id)).toEqual([{ id: owner.passkeyId, name: 'Phone' }]);

    expect((await remove(owner.session, owner.passkeyId)).status).toBe(200);
    expect(await passkeysOf(owner.id)).toEqual([]);
  });

  it("refuses to rename another account's passkey named by its id", async () => {
    const owner = await accountWithPasskey(OWNER);
    const other = await accountWithPasskey(OTHER);
    // Precondition: the same call on the owner's own passkey renames it.
    expect((await rename(owner.session, owner.passkeyId, 'Phone')).status).toBe(200);

    const refused = await rename(owner.session, other.passkeyId, 'Stolen');

    expect(refused.ok).toBe(false);
    expect(await passkeysOf(other.id)).toEqual([{ id: other.passkeyId, name: 'Laptop' }]);
  });

  it("refuses to remove another account's passkey named by its id", async () => {
    const owner = await accountWithPasskey(OWNER);
    const other = await accountWithPasskey(OTHER);
    await enrol(auth, owner.session, softKey(), 'Phone');
    // Precondition: the same call on the owner's own passkey removes it.
    expect((await remove(owner.session, owner.passkeyId)).status).toBe(200);

    const refused = await remove(owner.session, other.passkeyId);

    expect(refused.ok).toBe(false);
    expect(await passkeysOf(other.id)).toEqual([{ id: other.passkeyId, name: 'Laptop' }]);
  });
});

describe('the last way in', () => {
  it('refuses to remove the only passkey of an account with no provider and no password', async () => {
    const owner = await accountWithPasskey(OWNER);
    await sql`delete from accounts where user_id = ${owner.id}`;

    const refused = await remove(owner.session, owner.passkeyId);

    expect(refused.ok).toBe(false);
    expect((await refused.json()).code).toBe('LAST_SIGN_IN_METHOD');
    expect(await passkeysOf(owner.id)).toHaveLength(1);
  });

  it('removes one passkey of such an account while another remains', async () => {
    const owner = await accountWithPasskey(OWNER);
    await enrol(auth, owner.session, softKey(), 'Phone');
    await sql`delete from accounts where user_id = ${owner.id}`;

    expect((await remove(owner.session, owner.passkeyId)).status).toBe(200);
    expect(await passkeysOf(owner.id)).toHaveLength(1);
  });

  it('removes the only passkey of an account linked to a provider', async () => {
    const owner = await accountWithPasskey(OWNER);

    expect((await remove(owner.session, owner.passkeyId)).status).toBe(200);
    expect(await passkeysOf(owner.id)).toEqual([]);
  });

  it('removes the only passkey of an account with a password', async () => {
    const owner = await accountWithPasskey(OWNER);
    await sql`delete from accounts where user_id = ${owner.id}`;
    await sql`
      insert into accounts (account_id, provider_id, user_id, password, updated_at)
      values (${owner.id}, 'credential', ${owner.id}, 'fixture-hash', now())
    `;

    expect((await remove(owner.session, owner.passkeyId)).status).toBe(200);
    expect(await passkeysOf(owner.id)).toEqual([]);
  });

  it('refuses it where the only other account is for a provider off the roster', async () => {
    const owner = await accountWithPasskey(OWNER);
    await sql`delete from accounts where user_id = ${owner.id}`;
    await sql`
      insert into accounts (account_id, provider_id, user_id, updated_at)
      values (${owner.id}, 'github', ${owner.id}, now())
    `;

    const refused = await remove(owner.session, owner.passkeyId);

    expect(refused.ok).toBe(false);
    expect((await refused.json()).code).toBe('LAST_SIGN_IN_METHOD');
    expect(await passkeysOf(owner.id)).toHaveLength(1);
  });

  it('keeps one of two passkeys removed at once by an account with no other way in', async () => {
    const owner = await accountWithPasskey(OWNER);
    await enrol(auth, owner.session, softKey(), 'Phone');
    await sql`delete from accounts where user_id = ${owner.id}`;
    const both = await passkeysOf(owner.id);
    // Precondition: either passkey alone may go, as the other remains.
    expect(both).toHaveLength(2);

    // The test holds both rows locked until both removals are waiting on a lock, so each has read before either deletes.
    let removals: Promise<Response[]> | undefined;
    await sql.begin(async (tx) => {
      await tx`select id from passkeys where user_id = ${owner.id} for update`;
      removals = Promise.all(both.map(({ id }) => remove(owner.session, id)));
      await waitingOnLocks(2);
    });
    const responses = await (removals as Promise<Response[]>);

    expect(responses.filter((response) => response.ok)).toHaveLength(1);
    expect(await passkeysOf(owner.id)).toHaveLength(1);
  });

  it('refuses it where the credential account holds no password', async () => {
    const owner = await accountWithPasskey(OWNER);
    await sql`delete from accounts where user_id = ${owner.id}`;
    await sql`
      insert into accounts (account_id, provider_id, user_id, updated_at)
      values (${owner.id}, 'credential', ${owner.id}, now())
    `;

    expect((await remove(owner.session, owner.passkeyId)).ok).toBe(false);
    expect(await passkeysOf(owner.id)).toHaveLength(1);
  });
});
