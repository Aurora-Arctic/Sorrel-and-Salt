// The sentences the sign-in, password and two-factor forms answer a refused request with, in one place so the same refusal
// reads the same on every screen. Safe in the browser. The new-password sentences are in password-refusals.ts.

export const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a minute, then try again.';
export const WRONG_CODE = "That code isn't right. Please try again.";
export const WRONG_CREDENTIALS =
  "That email address and password don't match an account. Please try again.";

/** Better Auth answers a rate-limited request with status 429. */
export const rateLimited = (failure: { status?: number }): boolean => failure.status === 429;
