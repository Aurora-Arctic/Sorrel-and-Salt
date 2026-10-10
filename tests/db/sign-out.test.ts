import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHmac, randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { ORIGIN } from '../support/oauth';
import { B } from '../support/as-user';
import { importAuth } from '../support/auth-module';
import type { AuthInstance } from '../support/types';

// The account page's Sign Out (added in MB.63's PR, on the owner's call),
// through Better Auth's real endpoint: the session row goes, and the same
// cookie then reads as no one. The Playwright server cannot make this call,
// since Better Auth refuses the plain-http origin the remote browser reaches
// it on (claude-docs/components/sign-out-button.md, "Testing").

let sql: ReturnType<typeof postgres>;
let auth: AuthInstance;
let requestSession: typeof import('@/lib/request-session');

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  auth = await importAuth({});
  requestSession = await import('@/lib/request-session');
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  await sql`delete from sessions where user_id = ${B.id}`;
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

describe('signing out', () => {
  it('ends the session, so the same cookie reads as no one', async () => {
    const cookie = await signedInAs(B.id);
    // The precondition: the cookie is B's session.
    expect(await requestSession.sessionFromHeaders(new Headers({ cookie }))).toMatchObject({
      userId: B.id,
    });

    const response = await auth.handler(
      new Request(`${ORIGIN}/api/auth/sign-out`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: ORIGIN, cookie },
        body: '{}',
      }),
    );

    expect(response.status).toBe(200);
    expect(await sql`select 1 from sessions where user_id = ${B.id}`).toHaveLength(0);
    expect(await requestSession.sessionFromHeaders(new Headers({ cookie }))).toBeNull();
  });
});
