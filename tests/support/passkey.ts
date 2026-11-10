import type { AuthInstance } from './types';
import { cookieHeader } from './oauth';
import { assert, attest, type SoftKey } from './passkey-authenticator';
import { ORIGIN } from './constants';

const join = (...cookies: string[]) => cookies.filter(Boolean).join('; ');

export async function enrol(
  auth: AuthInstance,
  session: string,
  key: SoftKey,
  name?: string,
  origin: string = ORIGIN,
): Promise<Response> {
  const optionsResponse = await auth.handler(
    new Request(`${origin}/api/auth/passkey/generate-register-options`, {
      headers: { cookie: session, origin },
    }),
  );
  if (!optionsResponse.ok) return optionsResponse;
  const options = await optionsResponse.json();
  return auth.handler(
    new Request(`${origin}/api/auth/passkey/verify-registration`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: join(session, cookieHeader(optionsResponse)),
        origin,
      },
      body: JSON.stringify({ response: attest(key, options, origin), name }),
    }),
  );
}

export async function authenticationOptions(auth: AuthInstance, origin: string = ORIGIN) {
  const response = await auth.handler(
    new Request(`${origin}/api/auth/passkey/generate-authenticate-options`, {
      headers: { origin },
    }),
  );
  return { response, options: response.ok ? await response.json() : undefined };
}

export async function signInWithPasskey(
  auth: AuthInstance,
  key: SoftKey,
  { origin = ORIGIN, credentialId }: { origin?: string; credentialId?: string } = {},
): Promise<Response> {
  const { response: optionsResponse, options } = await authenticationOptions(auth, origin);
  if (!options) return optionsResponse;
  return auth.handler(
    new Request(`${origin}/api/auth/passkey/verify-authentication`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader(optionsResponse),
        origin,
      },
      body: JSON.stringify({ response: assert(key, options, origin, credentialId) }),
    }),
  );
}
