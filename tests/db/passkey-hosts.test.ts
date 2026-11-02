import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { base64 } from '@better-auth/utils/base64';
import { cookieHeader } from '../support/oauth';
import { assert, softKey, type SoftKey } from '../support/passkey-authenticator';
import { authenticationOptions } from '../support/passkey';

// The passkey plugin as a deploy runs it: NODE_ENV=production, the base URL
// resolved per request across the three hosts, and the limiter on. Better Auth
// reads NODE_ENV once at load, so it is stubbed before the first import
// (claude-docs/auth/plugins.md, "Passkeys"; claude-docs/auth/rate-limiting.md).

vi.stubEnv('NODE_ENV', 'production');
vi.stubEnv('TEST', '');
vi.stubEnv('BETTER_AUTH_SECRET', 'production-test-secret-at-least-32-characters-long');
vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'placeholder@admin-bootstrap.invalid');
vi.stubEnv('GOOGLE_CLIENT_ID', 'test-google-id');
vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-google-secret');

const { auth } = await import('@/lib/auth');

const PRODUCTION = 'https://sorrelandsalt.com';
const STAGING = 'https://staging.sorrelandsalt.com';
const HOTFIX = 'https://hotfix-1.sorrelandsalt.com';
const DOMAIN = '@passkey-hosts.test';

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
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from passkeys where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
});

/** An account holding `key` as its passkey, written as the plugin writes a registration. */
async function accountWith(key: SoftKey): Promise<string> {
  const id = randomUUID();
  await sql`
    insert into users (id, name, email, email_verified, role, created_by, updated_by)
    values (${id}, 'Fixture Person', ${`${id}${DOMAIN}`}, true, 'user', ${id}, ${id})
  `;
  await sql`
    insert into passkeys (name, public_key, user_id, credential_id, counter, device_type, backed_up, transports)
    values ('Laptop', ${base64.encode(key.publicCose)}, ${id}, ${key.credentialId}, 0, 'singleDevice', false, 'internal')
  `;
  return id;
}

async function signedInAs(response: Response, host: string): Promise<string | undefined> {
  const session = await auth.handler(
    new Request(`${host}/api/auth/get-session`, { headers: { cookie: cookieHeader(response) } }),
  );
  return (await session.json())?.user?.id;
}

/**
 * A sign-in at `host` from a page at `origin`, the authenticator signing over
 * `rpId` (by default the one the host's options name).
 */
async function verifyAt(host: string, origin: string, key: SoftKey, rpId?: string) {
  const { response: optionsResponse, options } = await authenticationOptions(auth, host);
  return auth.handler(
    new Request(`${host}/api/auth/passkey/verify-authentication`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader(optionsResponse),
        origin,
      },
      body: JSON.stringify({
        response: assert(key, { ...options, rpId: rpId ?? options.rpId }, origin),
      }),
    }),
  );
}

describe('the relying party follows the host the request came to', () => {
  it.each([
    [PRODUCTION, 'sorrelandsalt.com'],
    [STAGING, 'staging.sorrelandsalt.com'],
  ])('offers %s the rpId %s', async (host, rpId) => {
    const { options } = await authenticationOptions(auth, host);

    expect(options.rpId).toBe(rpId);
  });

  it("signs in with production's key on production, and refuses it on staging", async () => {
    const key = softKey();
    const id = await accountWith(key);

    const production = await verifyAt(PRODUCTION, PRODUCTION, key, 'sorrelandsalt.com');
    expect(await signedInAs(production, PRODUCTION)).toBe(id);

    // A staging page may ask the browser for its parent domain's key, so the
    // authenticator signs over production's rpId; staging expects its own.
    const staging = await verifyAt(STAGING, STAGING, key, 'sorrelandsalt.com');
    expect(staging.ok).toBe(false);
    expect(await signedInAs(staging, STAGING)).toBeUndefined();
  });

  it('refuses an assertion a trusted subdomain page posts to the production host', async () => {
    const key = softKey();
    const id = await accountWith(key);
    // Precondition: the hotfix host is a trusted origin, so Better Auth's own origin check lets it through.
    const context = await auth.$context;
    expect(context.trustedOrigins).toContain('https://hotfix-*.sorrelandsalt.com');
    expect(await signedInAs(await verifyAt(PRODUCTION, PRODUCTION, key), PRODUCTION)).toBe(id);

    const crossHost = await verifyAt(PRODUCTION, HOTFIX, key, 'sorrelandsalt.com');

    expect(crossHost.ok).toBe(false);
    expect(await signedInAs(crossHost, PRODUCTION)).toBeUndefined();
  });
});

describe('the passkey limit', () => {
  it('answers the fourth passkey request inside ten seconds with 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const { response } = await authenticationOptions(auth, STAGING);
      statuses.push(response.status);
    }

    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});
