import 'server-only';
import { createHmac } from 'node:crypto';
import { normaliseEmail } from './email-address';
import { requiredInProduction } from './env';

// The keys the signed-out send limits count under: an HMAC of the address, so `support_send_counts` holds no address and the
// same address always meets its own row. Keyed by BETTER_AUTH_SECRET, the one server secret every deploy already sets; a
// plain hash would let anyone holding the table test a guessed address against it. A new secret starts every count afresh,
// which costs at most one window of the limit.

// What next dev and Vitest key with when the secret is unset, as Better Auth falls back to its own default there.
const DEVELOPMENT_KEY = 'sorrel-development-send-count-key';

function keyed(kind: 'address' | 'client', value: string): string {
  const secret = requiredInProduction('BETTER_AUTH_SECRET') ?? DEVELOPMENT_KEY;
  return createHmac('sha256', secret).update(`support-send-count|${kind}|${value}`).digest('hex');
}

/** The count key for an email address, the same for every spelling `normaliseEmail` treats as one. */
export function addressCountKey(email: string): string {
  return keyed('address', normaliseEmail(email));
}

/** The count key for a client address. */
export function clientCountKey(client: string): string {
  return keyed('client', client.trim().toLowerCase());
}
