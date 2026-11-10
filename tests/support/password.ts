import { createHash } from 'node:crypto';
import { delay, http, HttpResponse } from 'msw';
import type { AuthInstance } from './types';
import { ORIGIN } from './constants';

const PWNED_RANGE = 'https://api.pwnedpasswords.com/range/:prefix';

export function sha1Hex(password: string): string {
  return createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
}

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

export const pwnedUnreachable = () => http.get(PWNED_RANGE, () => HttpResponse.error());

export const pwnedHanging = () =>
  http.get(PWNED_RANGE, async () => {
    await delay('infinite');
    return HttpResponse.text('');
  });

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

export function get(auth: AuthInstance, path: string, cookie?: string): Promise<Response> {
  return auth.handler(
    new Request(`${ORIGIN}/api/auth${path}`, { headers: cookie ? { cookie } : {} }),
  );
}
