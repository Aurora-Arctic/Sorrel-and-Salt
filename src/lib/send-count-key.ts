import 'server-only';
import { createHmac } from 'node:crypto';
import { normaliseEmail } from './email-address';
import { requiredInProduction } from './env';
import { fold } from './text';

// The keys the signed-out send limits count under: an HMAC of the address under BETTER_AUTH_SECRET, so the
// table holds no address (claude-docs/design-decisions/support.md, "Time-outs bind the address").
// A new secret starts every count afresh.

// What next dev and Vitest key with when the secret is unset, as Better Auth falls back to its own default there.
const DEVELOPMENT_KEY = 'sorrel-development-send-count-key';

function keyed(kind: 'address' | 'client', value: string): string {
  const secret = requiredInProduction('BETTER_AUTH_SECRET') ?? DEVELOPMENT_KEY;
  return createHmac('sha256', secret).update(`support-send-count|${kind}|${value}`).digest('hex');
}

export function addressCountKey(email: string): string {
  return keyed('address', normaliseEmail(email));
}

export function clientCountKey(client: string): string {
  return keyed('client', fold(client));
}
