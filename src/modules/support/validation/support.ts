import { z } from 'zod';
import {
  ERROR_REFERENCE_MAX_LENGTH,
  ISSUE_LINK_EXPECTED,
  ISSUE_REPOSITORY,
  PAGE_NOT_ON_SITE,
  isSitePage,
  normaliseIssueLink,
} from '../../../lib/support-path';
import { EMAIL_MAX_LENGTH } from '../../../lib/email-address';
import { trimEnds } from '../../../lib/formats';
import { requiredText } from '../../../lib/validation';
import { supportRequestAbout } from '../schema/support-requests';

import {
  HTTP_STATUS_MAX,
  HTTP_STATUS_MIN,
  MESSAGE_MAX_LENGTH,
  PATH_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
} from './limits';

export {
  ERROR_REFERENCE_MAX_LENGTH,
  ISSUE_REPOSITORY,
  MESSAGE_MAX_LENGTH,
  PATH_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
};

// A request as its sender writes it. The reply's body shares the message's limits, so one schema serves both.
export const SupportMessage = requiredText('Write a message', trimEnds).max(MESSAGE_MAX_LENGTH, {
  error: `Keep the message to ${MESSAGE_MAX_LENGTH} characters`,
});

const About = z.enum(supportRequestAbout.enumValues, { error: 'Choose what this is about' });

export const SupportRequestInput = z.object({
  about: About,
  subject: requiredText('Write a subject').max(SUBJECT_MAX_LENGTH, {
    error: `Keep the subject to ${SUBJECT_MAX_LENGTH} characters`,
  }),
  message: SupportMessage,
  path: z
    .string()
    .max(PATH_MAX_LENGTH, { error: 'That page address is too long' })
    .refine(isSitePage, { error: PAGE_NOT_ON_SITE })
    .nullish(),
  errorCode: z
    .number()
    .int()
    .min(HTTP_STATUS_MIN, { error: 'That is not an HTTP status' })
    .max(HTTP_STATUS_MAX, { error: 'That is not an HTTP status' })
    .nullish(),
  errorReference: z
    .string()
    .trim()
    .max(ERROR_REFERENCE_MAX_LENGTH, { error: 'That error reference is too long' })
    .nullish(),
});

export type SupportRequestInput = z.input<typeof SupportRequestInput>;

/** An issue link or a project-board link, stored as the plain issue link; see `normaliseIssueLink`. */
export const IssueUrlInput = z.string().transform((value, context) => {
  const link = normaliseIssueLink(value, ISSUE_REPOSITORY);
  if (link !== null) return link;
  context.addIssue({ code: 'custom', message: ISSUE_LINK_EXPECTED });
  return z.NEVER;
});

/** The topics a visitor with no account may write about: those whose problem can keep them from signing in, or that need no account to ask. */
export const SIGNED_OUT_ABOUTS = [
  'accessibility',
  'account',
  'bug',
  'privacy',
  'question',
] as const;

// A signed-out request. `website` is the honeypot: a field no person sees, so a value in it is a bot.
export const SignedOutSupportRequestInput = z.object({
  about: About,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(EMAIL_MAX_LENGTH, { error: 'That address is too long' })
    .pipe(z.email({ error: 'Enter an email address' })),
  subject: SupportRequestInput.shape.subject,
  message: SupportMessage,
  path: SupportRequestInput.shape.path,
  errorCode: SupportRequestInput.shape.errorCode,
  errorReference: SupportRequestInput.shape.errorReference,
  website: z.string().nullish(),
});

export type SignedOutSupportRequestInput = z.input<typeof SignedOutSupportRequestInput>;
