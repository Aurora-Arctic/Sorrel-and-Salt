import type { ValidationIssue } from './types';

// The one rule for what an email address looks like, in a file with no
// server-only import so the invite dialog checks an address before it sends
// and the services check it again: the same words either way. Lives here so the client can use it; the
// identity module's email service re-exports it.

/** Trimmed and lower-cased, as the column stores it. */
export function normaliseEmail(input: string): string {
  return input.trim().toLowerCase();
}

// Deliberately loose: the mail is the real check, and a rule stricter than
// the inbox refuses addresses that work. Replacing this function is the whole
// of the v2 swap for a real validator (claude-docs/backlog.md).
const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LENGTH = 254;

/** The one rule a normalised address broke, pathed to the field, or `null`. */
export function validateEmailAddress(email: string): ValidationIssue | null {
  const path = ['email'];
  if (email.length === 0) return { path, message: 'Enter an email address' };
  if (email.length > MAX_LENGTH || !SHAPE.test(email)) {
    return { path, message: "That doesn't look like an email address" };
  }
  if (email.endsWith('.invalid')) return { path, message: "That email address can't receive mail" };
  return null;
}
