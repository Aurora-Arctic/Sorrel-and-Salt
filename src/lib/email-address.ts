import { fold } from './text';
import type { ValidationIssue } from './types';

// The one rule for what an email address looks like, with no server-only import so the client and the
// services share it; the identity module's email service re-exports it. The zod schema is in email-address-schema.ts, so a
// client file drawn at first load can import this one without the schema library.

export function normaliseEmail(input: string): string {
  return fold(input);
}

// Deliberately loose: the mail is the real check, and a rule stricter than
// the inbox refuses addresses that work. Replacing this function is the whole
// of the v2 swap for a real validator (claude-docs/backlog.md).
const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 254;
export const EMAIL_FORMAT_MESSAGE =
  'Enter an email address in the correct format, like name@example.com';

/** RFC 2606 reserves `.invalid`: a provider that shared no address is given one there. */
export function isPlaceholderAddress(email: string): boolean {
  return email.endsWith('.invalid');
}

export function validateEmailAddress(email: string): ValidationIssue | null {
  const path = ['email'];
  if (email.length === 0) return { path, message: 'Enter an email address' };
  if (email.length > EMAIL_MAX_LENGTH || !SHAPE.test(email)) {
    return { path, message: EMAIL_FORMAT_MESSAGE };
  }
  if (isPlaceholderAddress(email))
    return { path, message: "That email address can't receive mail" };
  return null;
}

/** The rule as a field's `check`: the message for a bad address, or undefined. */
export const emailAddressProblem = (email: string): string | undefined =>
  validateEmailAddress(email)?.message;
