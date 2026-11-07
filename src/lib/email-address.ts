import type { ValidationIssue } from './types';

// The one rule for what an email address looks like, with no server-only import so the client and the
// services share it; the identity module's email service re-exports it.

export function normaliseEmail(input: string): string {
  return input.trim().toLowerCase();
}

// Deliberately loose: the mail is the real check, and a rule stricter than
// the inbox refuses addresses that work. Replacing this function is the whole
// of the v2 swap for a real validator (claude-docs/backlog.md).
const SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LENGTH = 254;

export function validateEmailAddress(email: string): ValidationIssue | null {
  const path = ['email'];
  if (email.length === 0) return { path, message: 'Enter an email address' };
  if (email.length > MAX_LENGTH || !SHAPE.test(email)) {
    return { path, message: "That doesn't look like an email address" };
  }
  if (email.endsWith('.invalid')) return { path, message: "That email address can't receive mail" };
  return null;
}
