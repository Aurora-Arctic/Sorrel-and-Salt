import { createHash } from 'node:crypto';
import { getCurrentAuthEndpointContext } from '@better-auth/core/context';
import { APIError, type BetterAuthPlugin } from 'better-auth';

// Refuses a password on Have I Been Pwned's list of breached passwords, by sending the range API only the first
// five characters of the password's SHA-1 hash (claude-docs/auth/passwords.md). Better Auth's own
// `haveIBeenPwned` plugin waits on the service for as long as it takes, so this one bounds the wait.

/** How long a check waits for the range API before refusing the password as unchecked. */
export const BREACHED_CHECK_TIMEOUT_MS = 3_000;

const RANGE = 'https://api.pwnedpasswords.com/range/';

/** Every endpoint that hashes a password a person chose, `/set-password` included. */
export const BREACHED_CHECK_PATHS = [
  '/sign-up/email',
  '/change-password',
  '/reset-password',
  '/set-password',
];

const UNCHECKED_MESSAGE = "We couldn't check your password just now. Please try again later.";

/** How many breaches list the password, or an INTERNAL_SERVER_ERROR when the service cannot say. */
async function breachCount(password: string): Promise<number> {
  const hash = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const suffix = `${hash.slice(5)}:`;
  let body: string;
  try {
    const response = await fetch(`${RANGE}${hash.slice(0, 5)}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'Sorrel & Salt password check' },
      signal: AbortSignal.timeout(BREACHED_CHECK_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`range API answered ${response.status}`);
    body = await response.text();
  } catch {
    // Fails closed: a timeout, an outage or a refusal leaves the password unchecked, so it is not accepted.
    throw new APIError('INTERNAL_SERVER_ERROR', { message: UNCHECKED_MESSAGE });
  }
  for (const line of body.split(/\r?\n/)) {
    if (!line.toUpperCase().startsWith(suffix)) continue;
    const count = Number(line.slice(suffix.length));
    if (!Number.isSafeInteger(count) || count < 0)
      throw new APIError('INTERNAL_SERVER_ERROR', { message: UNCHECKED_MESSAGE });
    return count;
  }
  return 0;
}

/**
 * Checks each password Better Auth hashes on one of `BREACHED_CHECK_PATHS`, refusing a breached one with
 * `message` and the code PASSWORD_COMPROMISED. Wrapping the hash, rather than hooking each endpoint's body,
 * reaches every call of those endpoints, from the browser or from `auth.api` alike.
 */
export const breachedPasswordCheck = ({ message }: { message: string }) =>
  ({
    id: 'breached-password',
    init(ctx) {
      const hash = ctx.password.hash;
      return {
        context: {
          password: {
            ...ctx.password,
            async hash(password: string) {
              const path = getCurrentAuthEndpointContext().path;
              if (path && BREACHED_CHECK_PATHS.includes(path) && (await breachCount(password)) > 0)
                throw new APIError('BAD_REQUEST', { message, code: 'PASSWORD_COMPROMISED' });
              return hash(password);
            },
          },
        },
      };
    },
  }) satisfies BetterAuthPlugin;
