import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import type { BetterAuthOptions } from 'better-auth';

// Better Auth's limiter through its real endpoint, counting in `rate_limits`
// (claude-docs/auth.md, "Rate limiting"). At NODE_ENV=production, as every
// deploy is: outside it the limiter is off, and under test Better Auth falls
// back to 127.0.0.1 for a request with no resolvable address rather than to
// the `no-trusted-ip` bucket a deploy would use. Better Auth reads NODE_ENV
// once, when it loads, so it is stubbed before the first import; `TEST`,
// which Vitest sets and Better Auth also takes for "under test", is cleared.

vi.stubEnv('NODE_ENV', 'production');
vi.stubEnv('TEST', '');
vi.stubEnv('BETTER_AUTH_SECRET', 'production-test-secret-at-least-32-characters-long');
vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'placeholder@admin-bootstrap.invalid');
vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-id');
vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-google-secret');

const { auth } = await import('@/lib/auth');
const { betterAuth } = await import('better-auth');

const STAGING = 'https://staging.sorrelandsalt.com';
const PATH = '/sign-in/social';
// Documentation ranges (RFC 5737), so no key here names a real visitor.
const VISITOR = '203.0.113.7';
const OTHER_VISITOR = '198.51.100.9';

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  await sql`truncate rate_limits`;
});

/** A sign-in start as Vercel hands it over: its own header, and whatever x-forwarded-for arrived. */
function startSignIn(
  handler: (request: Request) => Promise<Response>,
  headers: Record<string, string>,
): Promise<Response> {
  return handler(
    new Request(`${STAGING}/api/auth${PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: STAGING, ...headers },
      body: JSON.stringify({ provider: 'google', callbackURL: '/coven' }),
    }),
  );
}

async function rows() {
  return (await sql`
    select key, count from rate_limits order by key
  `) as unknown as { key: string; count: number }[];
}

afterEach(() => {
  vi.useRealTimers();
});

describe('the sign-in limit', () => {
  it('answers the fourth start inside ten seconds with 429 and X-Retry-After, counted in rate_limits', async () => {
    const from = { 'x-vercel-forwarded-for': VISITOR };

    for (let i = 0; i < 3; i++) {
      const allowed = await startSignIn(auth.handler, from);
      expect(allowed.status, await allowed.clone().text()).toBe(200);
    }
    const refused = await startSignIn(auth.handler, from);

    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get('x-retry-after'))).toBeGreaterThan(0);
    // The database counted: memory storage would leave the table empty.
    expect(await rows()).toEqual([{ key: `${VISITOR}|${PATH}`, count: 3 }]);
  });

  it('ignores a client-set x-forwarded-for, so varying it does not escape the limit', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const response = await startSignIn(auth.handler, {
        'x-vercel-forwarded-for': VISITOR,
        'x-forwarded-for': `192.0.2.${i + 1}`,
      });
      statuses.push(response.status);
    }

    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});

describe('the client address', () => {
  // Each start carries a two-hop x-forwarded-for, the shape Better Auth
  // refuses to trust, and Vercel's own header naming the visitor.
  const visitors = [VISITOR, OTHER_VISITOR].map((ip) => ({
    'x-vercel-forwarded-for': ip,
    'x-forwarded-for': `${ip}, 10.0.0.1`,
  }));

  it('counts two visitors separately, one row each', async () => {
    for (const from of visitors) {
      expect((await startSignIn(auth.handler, from)).status).toBe(200);
    }

    expect(await rows()).toEqual([
      { key: `${OTHER_VISITOR}|${PATH}`, count: 1 },
      { key: `${VISITOR}|${PATH}`, count: 1 },
    ]);
  });

  it('would have put both in one shared bucket without the header pinned', async () => {
    const options = auth.options as BetterAuthOptions;
    // The same configuration with only the header pin taken away.
    const unpinned = betterAuth({
      ...options,
      advanced: { ...options.advanced, ipAddress: undefined },
    });
    // Precondition: the only difference is the pin, so the pin is what separates them.
    expect((options.advanced?.ipAddress?.ipAddressHeaders ?? []).length).toBeGreaterThan(0);
    expect(unpinned.options.rateLimit).toEqual(options.rateLimit);

    for (const from of visitors) {
      expect((await startSignIn(unpinned.handler, from)).status).toBe(200);
    }

    expect(await rows()).toEqual([{ key: `no-trusted-ip|${PATH}`, count: 2 }]);
  });
});
