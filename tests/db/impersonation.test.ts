import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { ORIGIN, cookieHeader } from '../support/oauth';
import { A, B, E } from '../support/as-user';
import { importAuth } from '../support/auth-module';
import type { AuthInstance } from '../support/types';

// MB.53, through Better Auth's real endpoints with the plugin registered: an
// admin becomes the user they impersonate — that user's role, coven and
// stamps — and Stop gives the admin their own session back
// (claude-docs/auth/impersonation.md, "Impersonation").

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

let auth: AuthInstance;
let requestSession: typeof import('@/lib/request-session');

// The plugin is built only where the flag is on and the target is not
// production, and only at import; request-session joins the same graph.
beforeAll(async () => {
  auth = await importAuth({ ENABLE_IMPERSONATION: 'true', VERCEL_ENV: 'preview' });
  requestSession = await import('@/lib/request-session');
});

// The harness clones per file, not per test.
beforeEach(async () => {
  await sql`delete from sessions`;
});

/** A session row for `userId` and the cookie Better Auth would have set for it. */
async function signedInAs(userId: string): Promise<string> {
  const context = await auth.$context;
  const token = randomBytes(24).toString('base64url');
  await sql`
    insert into sessions (token, user_id, expires_at, updated_at)
    values (${token}, ${userId}, now() + interval '1 day', now())
  `;
  // better-call's `signCookieValue`: `<value>.<base64 HMAC-SHA256>`, percent-encoded.
  const signature = createHmac('sha256', context.secret).update(token).digest('base64');
  return `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${signature}`)}`;
}

function post(path: string, cookie: string, body?: unknown): Promise<Response> {
  return auth.handler(
    new Request(`${ORIGIN}/api/auth${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN, cookie },
      body: JSON.stringify(body ?? {}),
    }),
  );
}

const impersonate = (cookie: string, userId: string) =>
  post('/admin/impersonate-user', cookie, { userId });

/** A live user with no workspace, of the role given. */
async function insertUser(role: 'user' | 'admin'): Promise<string> {
  const id = randomUUID();
  await sql`
    insert into users (id, name, email, email_verified, role, created_by, updated_by)
    values (${id}, 'Fixture Person', ${`${id}@impersonation.test`}, true, ${role}, ${id}, ${id})
  `;
  return id;
}

describe('impersonating a user', () => {
  it('refuses a non-admin, where the same call answers an admin', async () => {
    const asA = await signedInAs(A.id);
    const asE = await signedInAs(E.id);

    // The precondition: B is a target the endpoint hands over.
    expect((await impersonate(asE, B.id)).status).toBe(200);

    const refused = await impersonate(asA, B.id);
    expect(refused.status).toBe(403);
    const [{ count }] = await sql`
      select count(*)::int as count from sessions where impersonated_by = ${A.id}
    `;
    expect(count).toBe(0);
  });

  it('refuses impersonating an admin, where the same user as a non-admin is handed over', async () => {
    const asE = await signedInAs(E.id);
    const target = await insertUser('user');
    expect((await impersonate(asE, target)).status).toBe(200);

    // An admin holds the creation flag, which the users CHECK requires (MB.177).
    await sql`update users set role = 'admin', can_create_workspace = true where id = ${target}`;

    expect((await impersonate(asE, target)).status).toBe(403);
  });

  it('gives the admin the user’s session, recording the admin on it', async () => {
    const asE = await signedInAs(E.id);

    const response = await impersonate(asE, B.id);
    expect(response.status).toBe(200);

    const session = await requestSession.sessionFromHeaders(
      new Headers({ cookie: cookieHeader(response) }),
    );
    expect(session).toEqual({ userId: B.id, role: 'user', impersonatedBy: E.id });
    const rows = await sql`
      select user_id, impersonated_by from sessions where impersonated_by is not null
    `;
    expect(rows).toContainEqual({ user_id: B.id, impersonated_by: E.id });
  });

  it('sees what the user sees: their coven, and no admin rights', async () => {
    // After the reset, so the class is the one the service throws.
    const { Forbidden } = await import('@/lib/errors');
    const { assertSiteAdmin } = await import('@/modules/identity');
    const { membershipsOf } = await import('@/modules/coven');
    const asE = await signedInAs(E.id);
    const admin = await requestSession.sessionFromHeaders(new Headers({ cookie: asE }));
    if (!admin) throw new Error('E has no session');
    // The precondition: E is a site admin in no coven.
    expect(() => assertSiteAdmin(admin)).not.toThrow();
    expect(await membershipsOf(admin, [E.id])).toEqual([[]]);

    const response = await impersonate(asE, B.id);
    const session = await requestSession.sessionFromHeaders(
      new Headers({ cookie: cookieHeader(response) }),
    );
    if (!session) throw new Error('the impersonation has no session');

    expect(() => assertSiteAdmin(session)).toThrow(Forbidden);
    const [memberships] = await membershipsOf(session, [B.id]);
    if (memberships instanceof Error) throw memberships;
    expect(memberships.map(({ workspaceId, role }) => ({ workspaceId, role }))).toEqual([
      { workspaceId: WORKSPACE_W_ID, role: 'member' },
    ]);
  });
});

describe('stopping', () => {
  it('returns the admin to their own session and ends the impersonation', async () => {
    const asE = await signedInAs(E.id);
    const impersonating = cookieHeader(await impersonate(asE, B.id));

    const stopped = await post('/admin/stop-impersonating', impersonating);
    expect(stopped.status).toBe(200);

    const session = await requestSession.sessionFromHeaders(
      new Headers({ cookie: cookieHeader(stopped) }),
    );
    expect(session).toEqual({ userId: E.id, role: 'admin' });
    const [{ count }] = await sql`
      select count(*)::int as count from sessions
      where user_id = ${B.id} and impersonated_by = ${E.id}
    `;
    expect(count).toBe(0);
  });

  it('refuses a session that is not impersonating anyone', async () => {
    const asB = await signedInAs(B.id);

    expect((await post('/admin/stop-impersonating', asB)).status).toBe(400);
  });
});
