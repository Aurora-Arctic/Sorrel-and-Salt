import type { ReactElement } from 'react';
import { isAccessPaused, pausedUntil } from '../../lib/access-paused';
import { impersonateUser } from '../../lib/auth-client';
import { inUtc } from '../../lib/utc';

// What Impersonate says and sends, once, for the two places that offer
// it: the users list's row button and the user modal's action. One
// wording and one send, so the two cannot drift apart.

/** Where an admin lands as the user: a full load of the home page. */
export const IMPERSONATION_LANDING = '/';

/** The question both ask before acting as someone else. */
export const impersonationQuestion = (name: string): ReactElement => (
  <>
    Impersonate <strong>{name}</strong>? You will see the site as they do, and act as them, until
    you press Stop Impersonating at the top of the page.
  </>
);

/** The sentence shown when the endpoint refuses: the pause and its end for a user whose site access is paused. */
export function impersonationRefusal(name: string, error?: unknown): string {
  if (!isAccessPaused(error)) return `You couldn't impersonate ${name}. Please try again.`;
  const until = pausedUntil(error.until ?? undefined);
  return until
    ? `You can't impersonate ${name}: their site access is paused until ${inUtc(until)}.`
    : `You can't impersonate ${name}: their site access is paused with no end date.`;
}

/** Starts the impersonation. Better Auth answers a refusal rather than throwing it, so this throws it. */
export async function sendImpersonation(userId: string): Promise<void> {
  const { error } = await impersonateUser({ userId });
  if (error) throw error;
}
