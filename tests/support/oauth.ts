import { expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import type { SetupServer } from 'msw/node';
import type { auth as Auth } from '@/lib/auth';

// Drives Better Auth's real `/api/auth/*` endpoints with MSW standing in for
// each provider, so what is under test is Better Auth's own flow with our
// hooks attached, not a hand-built context. MSW intercepts only what the
// server fetches; the requests into Better Auth are `auth.handler` calls.

export type ProviderId = 'google' | 'discord' | 'facebook' | 'microsoft';

export interface Profile {
  /** The provider's own stable account id. */
  sub: string;
  /** Absent or `null`: the provider shared no address, as Discord and Facebook can. */
  email?: string | null;
  verified: boolean;
}

export const ORIGIN = 'http://localhost:8000';

/** Where an unverified sign-in lands (MB.54), carrying the sign-in's own destination. */
export const EMAIL_PAGE = '/account/email?next=%2Fcoven';

/** Registers all four providers with test credentials; call before importing `@/lib/auth`. */
export function stubProviderCredentials(stubEnv: (name: string, value: string) => void): void {
  for (const provider of ['GOOGLE', 'DISCORD', 'FACEBOOK', 'MICROSOFT']) {
    stubEnv(`${provider}_CLIENT_ID`, `test-${provider.toLowerCase()}-id`);
    stubEnv(`${provider}_CLIENT_SECRET`, `test-${provider.toLowerCase()}-secret`);
  }
  stubEnv('MICROSOFT_TENANT_ID', '');
}

// An unsigned JWT: Google and Microsoft decode the id token they received from
// their own token endpoint without re-verifying it, which is what makes the
// code exchange, not the token's signature, the trust boundary here.
function idToken(claims: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ iat: now, exp: now + 3600, ...claims })}.`;
}

const TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';

export function providerHandlers(provider: ProviderId, profile: Profile) {
  const token = { access_token: 'test-access-token', token_type: 'Bearer', expires_in: 3600 };
  switch (provider) {
    case 'google':
      return [
        http.post('https://oauth2.googleapis.com/token', () =>
          HttpResponse.json({
            ...token,
            id_token: idToken({
              iss: 'https://accounts.google.com',
              aud: 'test-google-id',
              sub: profile.sub,
              // `undefined` is dropped from the claims, as a missing claim is.
              email: profile.email ?? undefined,
              email_verified: profile.verified,
              name: 'Fixture Person',
            }),
          }),
        ),
      ];
    case 'discord':
      return [
        http.post('https://discord.com/api/oauth2/token', () => HttpResponse.json(token)),
        // Better Auth percent-encodes the `@`, which MSW's path matcher does not decode.
        http.get('https://discord.com/api/users/%40me', () =>
          HttpResponse.json({
            id: profile.sub,
            username: 'fixtureperson',
            global_name: 'Fixture Person',
            discriminator: '0',
            avatar: null,
            // Discord answers `null` for an account with no verified address.
            email: profile.email ?? null,
            verified: profile.verified,
          }),
        ),
      ];
    case 'facebook':
      return [
        http.get('https://graph.facebook.com/v24.0/oauth/access_token', () =>
          HttpResponse.json(token),
        ),
        http.post('https://graph.facebook.com/v24.0/oauth/access_token', () =>
          HttpResponse.json(token),
        ),
        http.get('https://graph.facebook.com/debug_token', () =>
          HttpResponse.json({
            data: { is_valid: true, app_id: 'test-facebook-id', user_id: profile.sub },
          }),
        ),
        http.get('https://graph.facebook.com/me', () =>
          HttpResponse.json({
            id: profile.sub,
            name: 'Fixture Person',
            // Left out of the body altogether, as the Graph does under narrowed permissions.
            email: profile.email ?? undefined,
            // Facebook's graph never sends this, and Better Auth's own mapping
            // honours it when present; `mapProfileToUser` is what overrides it.
            email_verified: profile.verified,
            picture: { data: { url: 'https://example.test/p.png' } },
          }),
        ),
      ];
    case 'microsoft':
      return [
        http.post(`https://login.microsoftonline.com/common/oauth2/v2.0/token`, () =>
          HttpResponse.json({
            ...token,
            id_token: idToken({
              iss: `https://login.microsoftonline.com/${TENANT}/v2.0`,
              aud: 'test-microsoft-id',
              tid: TENANT,
              oid: profile.sub,
              sub: profile.sub,
              email: profile.email ?? undefined,
              email_verified: profile.verified,
              name: 'Fixture Person',
            }),
          }),
        ),
        http.get(
          'https://graph.microsoft.com/v1.0/me/photos/*',
          () => new HttpResponse(null, { status: 404 }),
        ),
      ];
  }
}

/** A response's `Set-Cookie` headers as one `Cookie` request header. */
export function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((header) => header.split(';')[0])
    .join('; ');
}

/** One full round trip: start the sign-in, then land on the callback. Returns the callback's redirect. */
export async function signIn(
  auth: typeof Auth,
  server: SetupServer,
  provider: ProviderId,
  profile: Profile,
): Promise<Response> {
  server.use(...providerHandlers(provider, profile));

  const start = await auth.handler(
    new Request(`${ORIGIN}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      body: JSON.stringify({ provider, callbackURL: '/coven' }),
    }),
  );
  expect(start.status, await start.clone().text()).toBe(200);
  const { url } = (await start.json()) as { url: string };
  const state = new URL(url).searchParams.get('state');

  return auth.handler(
    new Request(`${ORIGIN}/api/auth/callback/${provider}?code=test-code&state=${state}`, {
      headers: { cookie: cookieHeader(start) },
    }),
  );
}

/** Where a redirect sent the browser, as a same-site path whether its Location was absolute or not. */
export function landingOf(response: Response): string {
  const location = new URL(response.headers.get('location') ?? '', ORIGIN);
  return `${location.pathname}${location.search}`;
}

/**
 * The callback signed the browser in: it went where the sign-in asked, or to
 * the email page an unverified account lands on, and not to an error page.
 * A test about which of the two asserts `landingOf` itself.
 */
export function expectSignedIn(response: Response): void {
  expect(response.status).toBe(302);
  expect(['/coven', EMAIL_PAGE]).toContain(landingOf(response));
}
