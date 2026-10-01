import { expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import type { SetupServer } from 'msw/node';
import type { auth as Auth } from '@/lib/auth';
import { socialSignInTarget } from '@/lib/sign-in';
import type { ProviderId } from '@/lib/types';
import type { Profile } from './types';

// Drives Better Auth's real `/api/auth/*` endpoints with MSW standing in for
// each provider, so what is under test is Better Auth's own flow with our
// hooks attached, not a hand-built context. MSW intercepts only what the
// server fetches; the requests into Better Auth are `auth.handler` calls.

export const ORIGIN = 'http://localhost:8000';

/** Where an unverified sign-in lands (MB.54) when it asked for no return path, as `signIn` does by default. */
export const EMAIL_PAGE = '/account/email';

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

/**
 * A response's `Set-Cookie` headers as one `Cookie` request header, leaving
 * out the ones it expires, as a browser would: a callback expires its `state`
 * cookie, and carried on as `state=` it would shadow the next flow's.
 */
export function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .filter((header) => !/;\s*max-age=0\b/i.test(header))
    .map((header) => header.split(';')[0])
    .join('; ');
}

/**
 * One full round trip: start the sign-in headed for `next`, or for no return
 * path at all, with what SignInPanel would send, then land on the callback.
 * Returns the callback's redirect.
 */
export async function signIn(
  auth: typeof Auth,
  server: SetupServer,
  provider: ProviderId,
  profile: Profile,
  next?: string,
): Promise<Response> {
  server.use(...providerHandlers(provider, profile));

  const start = await auth.handler(
    new Request(`${ORIGIN}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      body: JSON.stringify({ provider, ...socialSignInTarget(next) }),
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

/** Where a link flow lands, and where its errors land with `?error=`: the account page's own. */
export const LINK_LANDING = '/account';

/**
 * One full link round trip from a signed-in browser: `/link-social` under
 * `cookie`, then the callback. `callbackCookie` stands in for whichever
 * session the browser carries when it lands, which is the starter's own
 * unless a test says otherwise. Returns the callback's redirect.
 */
export async function link(
  auth: typeof Auth,
  server: SetupServer,
  cookie: string,
  provider: ProviderId,
  profile: Profile,
  options: { additionalData?: Record<string, unknown>; callbackCookie?: string } = {},
): Promise<Response> {
  server.use(...providerHandlers(provider, profile));

  const start = await auth.handler(
    new Request(`${ORIGIN}/api/auth/link-social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN, cookie },
      body: JSON.stringify({
        provider,
        callbackURL: LINK_LANDING,
        errorCallbackURL: LINK_LANDING,
        additionalData: options.additionalData,
      }),
    }),
  );
  expect(start.status, await start.clone().text()).toBe(200);
  const { url } = (await start.json()) as { url: string };
  const state = new URL(url).searchParams.get('state');

  return auth.handler(
    new Request(`${ORIGIN}/api/auth/callback/${provider}?code=test-code&state=${state}`, {
      headers: { cookie: `${options.callbackCookie ?? cookie}; ${cookieHeader(start)}` },
    }),
  );
}

/** Where a redirect sent the browser, as a same-site path whether its Location was absolute or not. */
export function landingOf(response: Response): string {
  const location = new URL(response.headers.get('location') ?? '', ORIGIN);
  return `${location.pathname}${location.search}`;
}

/**
 * The callback signed the browser in: it went to the landing a sign-in with
 * no return path gets, or to the email page an unverified account lands on,
 * and not to an error page. A test about which asserts `landingOf` itself.
 */
export function expectSignedIn(response: Response): void {
  expect(response.status).toBe(302);
  expect(['/coven', '/admin', EMAIL_PAGE]).toContain(landingOf(response));
}
