// The sentences a refused new password is answered with, shared by every form that chooses one and by the
// server's set-password path, so a rule reads the same wherever it refuses. Safe in the browser.

const LENGTH_REFUSALS: Readonly<Record<string, string>> = {
  PASSWORD_TOO_SHORT: 'Use at least 15 characters.',
  PASSWORD_TOO_LONG: 'Use 128 characters or fewer.',
};

/** What a form says when the breached-password check could not answer, which refuses rather than waves through. */
export const PASSWORD_CHECK_UNAVAILABLE =
  "We couldn't check your password just now. Please try again later.";

/**
 * The sentence for a refusal of the new password itself, or `undefined` for any other refusal. The
 * breached-list refusal keeps the server's own sentence, which says why.
 */
export function newPasswordRefusal(failure: {
  code?: string;
  message?: string;
}): string | undefined {
  if (failure.code === 'PASSWORD_COMPROMISED') return failure.message;
  return failure.code ? LENGTH_REFUSALS[failure.code] : undefined;
}
