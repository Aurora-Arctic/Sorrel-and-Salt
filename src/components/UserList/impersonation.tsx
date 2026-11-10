import type { ReactElement } from 'react';
import { impersonateUser } from '../../lib/auth-client';

// What Impersonate says and sends, once, for the two places that offer
// it: the users list's row button and the user modal's action. One
// wording and one send, so the two cannot drift apart.

export const IMPERSONATION_LANDING = '/';

export const impersonationQuestion = (name: string): ReactElement => (
  <>
    Impersonate <strong>{name}</strong>? You will see the site as they do, and act as them, until
    you press Stop Impersonating at the top of the page.
  </>
);

export const impersonationRefusal = (name: string): string =>
  `You couldn't impersonate ${name}. Please try again.`;

/** Starts the impersonation. Better Auth answers a refusal rather than throwing it, so this throws it. */
export async function sendImpersonation(userId: string): Promise<void> {
  const { error } = await impersonateUser({ userId });
  if (error) throw error;
}
