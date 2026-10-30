import { afterEach, describe, expect, it, vi } from 'vitest';
import { e2eTrustedOrigins, plainSessionCookie } from '@/lib/e2e-session-cookie';
import { warmImport } from '../support/warm-import';

warmImport(() => import('@/lib/auth'));

// The audit's e2e servers name Better Auth's cookies without the `__Secure-` prefix, so a WebKit
// page on the plain-http origin of a remote browser sends the session cookie it was given. A
// deploy never does: the flag is ignored wherever Vercel has set a deploy target.

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('plainSessionCookie', () => {
  it.each([
    { flag: 'true', target: undefined, plain: true },
    { flag: 'true', target: 'production', plain: false },
    { flag: undefined, target: undefined, plain: false },
  ])('flag $flag at VERCEL_ENV=$target is $plain', ({ flag, target, plain }) => {
    expect(plainSessionCookie({ E2E_PLAIN_SESSION_COOKIE: flag, VERCEL_ENV: target })).toBe(plain);
  });
});

async function sessionCookieName(flag: string | undefined) {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('BETTER_AUTH_SECRET', 'fixture-secret-for-the-cookie-name-test');
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'placeholder@admin-bootstrap.invalid');
  vi.stubEnv('E2E_PLAIN_SESSION_COOKIE', flag);
  vi.stubEnv('VERCEL_ENV', undefined);
  vi.resetModules();
  const { auth } = await import('@/lib/auth');
  return (await auth.$context).authCookies.sessionToken.name;
}

describe('the session cookie name under a production build', () => {
  it('carries the __Secure- prefix by default, because the base URL forces https', async () => {
    expect(await sessionCookieName(undefined)).toBe('__Secure-better-auth.session_token');
  });
});

// A production build trusts only the deployed hosts, so an e2e browser's sign-up or sign-in POST from
// localhost or the compose name `devcontainer` would be refused as an invalid origin. The e2e servers alone
// trust those two, on their own port.
describe('e2eTrustedOrigins', () => {
  it('names localhost and devcontainer on the server port when the flag is set off Vercel', () => {
    expect(e2eTrustedOrigins({ E2E_PLAIN_SESSION_COOKIE: 'true', PORT: '8300' })).toEqual([
      'http://localhost:8300',
      'http://devcontainer:8300',
    ]);
  });

  it.each([
    { flag: 'true', target: 'preview' },
    { flag: undefined, target: undefined },
  ])('names none for flag $flag at VERCEL_ENV=$target', ({ flag, target }) => {
    expect(
      e2eTrustedOrigins({ E2E_PLAIN_SESSION_COOKIE: flag, VERCEL_ENV: target, PORT: '8300' }),
    ).toEqual([]);
  });
});

async function trustedOrigins(flag: string | undefined) {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('BETTER_AUTH_SECRET', 'fixture-secret-for-the-cookie-name-test');
  vi.stubEnv('ADMIN_BOOTSTRAP_EMAIL', 'placeholder@admin-bootstrap.invalid');
  vi.stubEnv('E2E_PLAIN_SESSION_COOKIE', flag);
  vi.stubEnv('VERCEL_ENV', undefined);
  vi.stubEnv('PORT', '8300');
  vi.resetModules();
  const { auth } = await import('@/lib/auth');
  return (await auth.$context).trustedOrigins;
}

describe('the trusted origins under a production build', () => {
  it('include the e2e server origin only when the flag is set', async () => {
    expect(await trustedOrigins(undefined)).not.toContain('http://localhost:8300');
    expect(await trustedOrigins('true')).toContain('http://localhost:8300');
  });
});
