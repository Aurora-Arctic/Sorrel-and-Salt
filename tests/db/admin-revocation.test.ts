import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHmac, randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { Forbidden } from '@/lib/errors';
import { E, asUser } from '../support/as-user';
import { importAuth } from '../support/auth-module';
import { asManualFix } from '../support/db/privileges';
import { run } from '../support/graphql/run';
import type { AuthInstance } from '../support/types';
import { useTestDatabase } from '../support/db/database';

// A revoked admin's sessions stay valid and their next request reads `role: 'user'` off the users row, so `/keepers` and every keeper mutation close at once (claude-docs/design-decisions/auth.md, "Revoking").
// Through the real session reader; the cookie cache that would keep the old role is pinned off in tests/lib/auth.test.ts.

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => {
  sql = client;
});

let auth: AuthInstance;
let requestSession: typeof import('@/lib/request-session');
let identity: typeof import('@/modules/identity');

const REVOKED = '00000000-0000-0000-0000-0000000000f1';

beforeAll(async () => {
  auth = await importAuth({});
  requestSession = await import('@/lib/request-session');
  identity = await import('@/modules/identity');
});

beforeEach(async () => {
  await sql`truncate user_privilege_changes`;
  await sql`delete from sessions where user_id = ${REVOKED}`;
  await sql`delete from users where id = ${REVOKED}`;
  await asManualFix(
    sql,
    (tx) => tx`
      insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
      values (${REVOKED}, 'Revoked Fixturewort', 'revoked@admin-revocation.test', true, 'admin', true, ${REVOKED}, ${REVOKED})
    `,
  );
});

async function signedInAs(userId: string): Promise<Headers> {
  const context = await auth.$context;
  const token = randomBytes(24).toString('base64url');
  await sql`
    insert into sessions (token, user_id, expires_at, updated_at)
    values (${token}, ${userId}, now() + interval '1 day', now())
  `;
  // better-call's `signCookieValue`: `<value>.<base64 HMAC-SHA256>`, percent-encoded.
  const signature = createHmac('sha256', context.secret).update(token).digest('base64');
  return new Headers({
    cookie: `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${signature}`)}`,
  });
}

const sessionsOf = async () =>
  sql`select token from sessions where user_id = ${REVOKED} order by token`;

describe('a revoked admin’s next request', () => {
  it('reads the user role off the same session, refused at /keepers and at a keeper mutation', async () => {
    const headers = await signedInAs(REVOKED);
    const before = await requestSession.sessionFromHeaders(headers);
    // The precondition: the same cookie was a keeper's, admitted by both gates.
    expect(before).toEqual({ userId: REVOKED, role: 'admin' });
    expect(() => identity.assertSiteAdmin(before!)).not.toThrow();
    const probe = `mutation { setUserRole(userId: "${E.id}", role: admin) { id } }`;
    // Past the scope: the service's own refusal, in other words than the scope's.
    const admitted = (await run(before, probe)).errors?.[0];
    expect(admitted?.extensions?.code).toBe('FORBIDDEN');
    expect(admitted?.message).not.toBe(new Forbidden().message);
    const issued = await sessionsOf();

    await identity.setUserRole(asUser(E), REVOKED, 'user');

    const after = await requestSession.sessionFromHeaders(headers);
    expect(after).toEqual({ userId: REVOKED, role: 'user' });
    // What `/keepers`'s guard asks, and the mutation's scope refusing first.
    // The identity module here is the auth import's graph, so its `Forbidden`
    // is another class than this file's: the name is what is compared.
    expect(() => identity.assertSiteAdmin(after!)).toThrow(
      expect.objectContaining({ name: 'Forbidden' }),
    );
    const refused = await run(after, probe);
    expect(refused.errors?.[0]).toMatchObject({
      message: new Forbidden().message,
      extensions: { code: 'FORBIDDEN' },
    });
    // Still signed in, on the one session they had.
    expect(await sessionsOf()).toEqual(issued);
  });
});
