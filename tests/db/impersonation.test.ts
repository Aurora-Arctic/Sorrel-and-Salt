import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { cookieHeader } from '../support/oauth';
import { liftUserAccessPause, pauseUserAccess } from '@/modules/identity';
import { A, B, E, F, asUser } from '../support/as-user';
import { importAuth } from '../support/auth-module';
import { asManualFix } from '../support/db/privileges';
import type { AuthInstance } from '../support/types';
import { noPauseNotifier, PAUSE_MESSAGE } from '../support/email-verification';
import { useTestDatabase } from '../support/db/database';
import { ORIGIN } from '../support/constants';

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => {
  sql = client;
});

let auth: AuthInstance;
let requestSession: typeof import('@/lib/request-session');

// The plugin is built only where the flag is on and the target is not
// production, and only at import; request-session joins the same graph.
beforeAll(async () => {
  auth = await importAuth({ ENABLE_IMPERSONATION: 'true', VERCEL_ENV: 'preview' });
  requestSession = await import('@/lib/request-session');
});

beforeEach(async () => {
  await sql`delete from sessions`;
});

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

async function insertUser(role: 'user' | 'admin'): Promise<string> {
  const id = randomUUID();
  await sql`
    insert into users (id, name, email, email_verified, role, created_by, updated_by)
    values (${id}, 'Fixture Person', ${`${id}@impersonation.test`}, true, ${role}, ${id}, ${id})
  `;
  return id;
}

describe('impersonating a user', () => {
  it('refuses a non-keeper, where the same call answers an admin', async () => {
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

  it('refuses impersonating a keeper, where the same user as a non-keeper is handed over', async () => {
    const asE = await signedInAs(E.id);
    const target = await insertUser('user');
    expect((await impersonate(asE, target)).status).toBe(200);

    await asManualFix(
      sql,
      (tx) => tx`update users set role = 'admin', can_create_workspace = true where id = ${target}`,
    );

    expect((await impersonate(asE, target)).status).toBe(403);
  });

  // A curator holds no permission in the plugin, whose admin roles
  // stay `['admin']`, so it impersonates no one. F curates, so the refusal is
  // the people page's check, not a session without a site role.
  it('refuses a curator, who passes the curation check, where the same call answers an admin', async () => {
    const { assertCurator } = await import('@/modules/identity');
    const asF = await signedInAs(F.id);
    const curator = await requestSession.sessionFromHeaders(new Headers({ cookie: asF }));
    if (!curator) throw new Error('F has no session');
    expect(curator.role).toBe('curator');
    expect(assertCurator(curator)).toMatchObject({ userId: F.id });
    expect((await impersonate(await signedInAs(E.id), B.id)).status).toBe(200);

    expect((await impersonate(asF, B.id)).status).toBe(403);
    const [{ count }] = await sql`
      select count(*)::int as count from sessions where impersonated_by = ${F.id}
    `;
    expect(count).toBe(0);
  });

  // The plugin shields only its admin roles, so a curator is handed over as
  // any non-keeper is.
  it('hands a curator over to a keeper, as any non-keeper is', async () => {
    const response = await impersonate(await signedInAs(E.id), F.id);
    expect(response.status).toBe(200);

    const session = await requestSession.sessionFromHeaders(
      new Headers({ cookie: cookieHeader(response) }),
    );
    expect(session).toEqual({ userId: F.id, role: 'curator', impersonatedBy: E.id });
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

  it('sees what the user sees: their coven, and no keeper rights', async () => {
    // After the reset, so the class is the one the service throws.
    const { Forbidden } = await import('@/lib/errors');
    const { assertSiteAdmin } = await import('@/modules/identity');
    const { membershipsOf } = await import('@/modules/coven');
    const asE = await signedInAs(E.id);
    const admin = await requestSession.sessionFromHeaders(new Headers({ cookie: asE }));
    if (!admin) throw new Error('E has no session');
    // The precondition: E is a site keeper in no coven.
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

// A paused user is shown to the admin as the paused user sees the site: every signed-in page goes to the paused page and every
// signed-in API call is refused with the pause's code (claude-docs/auth/impersonation.md, "Impersonation").
describe('impersonating a paused user', () => {
  async function sessionOf(cookie: string) {
    const response = await auth.handler(
      new Request(`${ORIGIN}/api/auth/get-session`, { headers: { cookie } }),
    );
    const body = (await response.json()) as { user?: { id: string } } | null;
    return body?.user?.id;
  }

  async function graphql(cookie: string, query: string) {
    const { POST } = await import('@/app/api/graphql/route');
    const response = await POST(
      new Request(`${ORIGIN}/api/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-sorrel-client': 'web', cookie },
        body: JSON.stringify({ query }),
      }),
    );
    return (await response.json()) as {
      data?: Record<string, unknown> | null;
      errors?: { extensions?: { code?: string; pausedUntil?: string | null } }[];
    };
  }

  const ME = 'query { me { id } }';

  async function impersonatingPaused(until: Date | null) {
    const target = await insertUser('user');
    const asE = await signedInAs(E.id);
    await pauseUserAccess(
      asUser(E),
      target,
      until,
      'A fixture pause',
      noPauseNotifier,
      PAUSE_MESSAGE,
    );
    const response = await impersonate(asE, target);
    return { target, asE, response, cookie: cookieHeader(response) };
  }

  it('hands the paused user over, recording the admin on the session', async () => {
    const { target, response, cookie } = await impersonatingPaused(null);

    expect(response.status).toBe(200);
    expect(await sessionOf(cookie)).toBe(target);
    const rows = await sql`select impersonated_by from sessions where user_id = ${target}`;
    expect(rows).toEqual([{ impersonated_by: E.id }]);
  });

  it('reads the session as paused, with the pause’s end, where an unpaused impersonation reads as signed in', async () => {
    const until = new Date(Date.now() + 86_400_000);
    const unpaused = cookieHeader(await impersonate(await signedInAs(E.id), B.id));
    const open = await requestSession.sessionStateFromHeaders(new Headers({ cookie: unpaused }));
    expect(open.session).toMatchObject({ userId: B.id, impersonatedBy: E.id });
    expect(open.accessPause).toBeUndefined();

    const { target, cookie } = await impersonatingPaused(until);
    const paused = await requestSession.sessionStateFromHeaders(new Headers({ cookie }));

    expect(paused.session).toMatchObject({ userId: target, impersonatedBy: E.id });
    expect(paused.accessPause).toEqual({ until });
    // Every reader that gives a page or the proxy its session sees nobody signed in.
    expect(await requestSession.sessionFromHeaders(new Headers({ cookie }))).toBeNull();
  });

  it('answers a signed-in API call with the pause’s code and end, where the same call answers the unpaused user', async () => {
    const unpaused = cookieHeader(await impersonate(await signedInAs(E.id), B.id));
    expect((await graphql(unpaused, ME)).data).toEqual({ me: { id: B.id } });

    const { cookie } = await impersonatingPaused(null);
    const answer = await graphql(cookie, ME);

    expect(answer.errors?.[0]?.extensions).toEqual({ code: 'ACCESS_PAUSED', pausedUntil: null });
  });

  it('answers a public read as it answers anyone signed out', async () => {
    const { cookie } = await impersonatingPaused(null);

    const answer = await graphql(cookie, 'query { compendium(first: 1) { totalCount } }');

    expect(answer.errors).toBeUndefined();
    expect(answer.data).toMatchObject({ compendium: { totalCount: expect.any(Number) } });
  });

  it('stops back into the admin’s own session', async () => {
    const { cookie } = await impersonatingPaused(null);

    const stopped = await post('/admin/stop-impersonating', cookie);

    expect(stopped.status).toBe(200);
    const state = await requestSession.sessionStateFromHeaders(
      new Headers({ cookie: cookieHeader(stopped) }),
    );
    expect(state.session).toEqual({ userId: E.id, role: 'admin' });
    expect(state.accessPause).toBeUndefined();
  });

  it('reads as signed in once the pause is lifted, with the same impersonation', async () => {
    const { target, cookie } = await impersonatingPaused(null);
    expect((await graphql(cookie, ME)).errors?.[0]?.extensions?.code).toBe('ACCESS_PAUSED');

    await liftUserAccessPause(asUser(E), target);

    const state = await requestSession.sessionStateFromHeaders(new Headers({ cookie }));
    expect(state.session).toMatchObject({ userId: target, impersonatedBy: E.id });
    expect(state.accessPause).toBeUndefined();
    expect((await graphql(cookie, ME)).data).toEqual({ me: { id: target } });
  });
});
