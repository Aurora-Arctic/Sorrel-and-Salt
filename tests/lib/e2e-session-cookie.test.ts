import { afterEach, describe, expect, it, vi } from 'vitest';
import { plainSessionCookie } from '@/lib/e2e-session-cookie';
import { warmImport } from '../support/warm-import';

warmImport(() => import('@/lib/auth'));

// MB.255: the audit's e2e servers name Better Auth's cookies without the `__Secure-`
// prefix, so a WebKit page on the plain-http origin of a remote browser sends
// the session cookie it was given. A deploy never does: the flag is ignored
// wherever Vercel has set a deploy target.

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
