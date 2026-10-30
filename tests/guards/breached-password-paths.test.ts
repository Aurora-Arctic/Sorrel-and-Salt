import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { auth } from '@/lib/auth';
import { BREACHED_CHECK_PATHS } from '@/lib/breached-password';

// The breached-password check reaches only the routes `BREACHED_CHECK_PATHS` names, so an endpoint a Better Auth
// upgrade or a new plugin adds would take a new password unchecked. This reads every endpoint the configured
// instance registers and fails on one that takes a password and is on no list below (claude-docs/auth/passwords.md).

/** The body fields an endpoint takes a password in, whether a new one or one it checks against the account. */
const PASSWORD_FIELDS = ['password', 'newPassword'];

/** Endpoints that check a password the account already holds, which the breached check has no reason to see. */
const CHECKS_A_HELD_PASSWORD = [
  '/sign-in/email',
  '/verify-password',
  '/delete-user',
  '/two-factor/enable',
  '/two-factor/disable',
  '/two-factor/get-totp-uri',
  '/two-factor/generate-backup-codes',
];

/** Endpoints with no route, so no path to match: each is called only inside `withBreachedCheck`, from the file named. */
const SERVER_ONLY_WRAPPED: Record<string, string> = { setPassword: 'src/lib/password-setter.ts' };

/** Endpoints whose body has no schema to read, each with why it takes no password. */
const NO_BODY_SCHEMA: Record<string, string> = {
  '/sign-up/email': 'on BREACHED_CHECK_PATHS',
  '/sign-out': 'takes no body',
  '/callback/:id': "the provider's answer",
  '/update-session': "the session's own fields",
  '/update-user': 'Better Auth refuses a password here',
  '/refresh-token': 'a provider token',
  '/get-access-token': 'a provider token',
  '/two-factor/send-otp': 'whether to trust the device; a mailed code, which is not configured',
};

interface Endpoint {
  path?: string;
  options?: { body?: { shape?: Record<string, unknown> } };
}

const endpoints = Object.entries(auth.api as unknown as Record<string, Endpoint>);

describe('every endpoint that takes a password is checked or named', () => {
  it('names each endpoint whose body it cannot read', () => {
    const unread = endpoints
      .filter(([, endpoint]) => endpoint.options?.body && !endpoint.options.body.shape)
      .map(([name, endpoint]) => endpoint.path ?? name);
    // Precondition: sign-up, the one route that surely takes a password, is among them.
    expect(unread).toContain('/sign-up/email');
    expect(unread.filter((path) => !(path in NO_BODY_SCHEMA))).toEqual([]);
  });

  it('checks every new password, or names the endpoint as checking a held one', () => {
    const taking = endpoints.filter(([, endpoint]) =>
      PASSWORD_FIELDS.some((field) => field in (endpoint.options?.body?.shape ?? {})),
    );
    // Precondition: the routes that do take a password are read, so an empty answer is not a blind one.
    expect(taking.map(([, endpoint]) => endpoint.path)).toEqual(
      expect.arrayContaining(['/sign-in/email', '/reset-password', '/change-password']),
    );

    const unchecked = taking
      .filter(([name, endpoint]) =>
        endpoint.path === undefined
          ? !(name in SERVER_ONLY_WRAPPED)
          : !BREACHED_CHECK_PATHS.includes(endpoint.path) &&
            !CHECKS_A_HELD_PASSWORD.includes(endpoint.path),
      )
      .map(([name, endpoint]) => endpoint.path ?? name);
    expect(unchecked).toEqual([]);
  });

  it('wraps each server-only endpoint in the check where it is called', () => {
    for (const [name, file] of Object.entries(SERVER_ONLY_WRAPPED)) {
      expect(readFileSync(file, 'utf8')).toMatch(
        new RegExp(String.raw`withBreachedCheck\(\s*\(\)\s*=>\s*auth\.api\.${name}\(`),
      );
    }
  });
});
