import { createHash } from 'node:crypto';
import { delay, http, HttpResponse } from 'msw';
import { ORIGIN } from './oauth';
import type { AuthInstance } from './types';

/** The Have I Been Pwned range endpoint, which takes the first five characters of a password's SHA-1 hash. */
export const PWNED_RANGE = 'https://api.pwnedpasswords.com/range/:prefix';

/** A password's SHA-1 hash in upper-case hex, as the range API lists it. */
export function sha1Hex(password: string): string {
  return createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
}

/**
 * Stands in for the range API: answers each prefix with the suffixes of `breached` that share it, plus one
 * padding line, and records every request so a test can read what left the server.
 */
export function pwnedRange(breached: readonly string[], requests: Request[]) {
  return http.get(PWNED_RANGE, ({ request, params }) => {
    requests.push(request.clone());
    const prefix = String(params.prefix);
    const lines = breached
      .map(sha1Hex)
      .filter((hash) => hash.startsWith(prefix))
      .map((hash) => `${hash.slice(5)}:52`);
    lines.push(`${'0'.repeat(35)}:0`);
    return HttpResponse.text(lines.join('\r\n'));
  });
}

/** The range API unreachable: the connection fails before any answer. */
export const pwnedUnreachable = () => http.get(PWNED_RANGE, () => HttpResponse.error());

/** The range API accepting the connection and never answering. */
export const pwnedHanging = () =>
  http.get(PWNED_RANGE, async () => {
    await delay('infinite');
    return HttpResponse.text('');
  });

/** A JSON POST to one of Better Auth's endpoints, from this origin, carrying `cookie` when given. */
export function post(
  auth: AuthInstance,
  path: string,
  body: unknown,
  cookie?: string,
): Promise<Response> {
  return auth.handler(
    new Request(`${ORIGIN}/api/auth${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN, ...(cookie && { cookie }) },
      body: JSON.stringify(body),
    }),
  );
}

/** A GET to one of Better Auth's endpoints, carrying `cookie` when given. */
export function get(auth: AuthInstance, path: string, cookie?: string): Promise<Response> {
  return auth.handler(
    new Request(`${ORIGIN}/api/auth${path}`, { headers: cookie ? { cookie } : {} }),
  );
}
