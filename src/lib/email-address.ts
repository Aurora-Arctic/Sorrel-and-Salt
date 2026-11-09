import { z } from 'zod';
import type { FieldFormat } from './formats';
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
export const EMAIL_FORMAT_MESSAGE =
  'Enter an email address in the correct format, like name@example.com';

export function validateEmailAddress(email: string): ValidationIssue | null {
  const path = ['email'];
  if (email.length === 0) return { path, message: 'Enter an email address' };
  if (email.length > MAX_LENGTH || !SHAPE.test(email)) {
    return { path, message: EMAIL_FORMAT_MESSAGE };
  }
  if (email.endsWith('.invalid')) return { path, message: "That email address can't receive mail" };
  return null;
}

/** The blur tidy: trims the ends and lower-cases the domain, since only the local part may be case-sensitive. */
export const emailFormat: FieldFormat = (text) => {
  const trimmed = text.trim();
  const at = trimmed.lastIndexOf('@');
  return at < 0 ? trimmed : `${trimmed.slice(0, at)}@${trimmed.slice(at + 1).toLowerCase()}`;
};

/** The one zod schema for an address in a form or a request; its output is the normalised address. */
export const EmailAddress = z
  .string()
  .transform(normaliseEmail)
  .superRefine((email, ctx) => {
    const issue = validateEmailAddress(email);
    if (issue) ctx.addIssue({ code: 'custom', message: issue.message });
  });
