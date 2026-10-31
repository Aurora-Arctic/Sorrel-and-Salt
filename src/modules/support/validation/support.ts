import { z } from 'zod';
import {
  ISSUE_LINK_EXPECTED,
  ISSUE_REPOSITORY,
  PAGE_NOT_ON_SITE,
  isSitePage,
  normaliseIssueLink,
} from '../../../lib/support-path';
import { requiredText } from '../../../lib/validation';
import { supportRequestAbout } from '../schema/support-requests';

export const SUBJECT_MAX_LENGTH = 120;
export const MESSAGE_MAX_LENGTH = 4000;
export const PATH_MAX_LENGTH = 500;
export const ERROR_REFERENCE_MAX_LENGTH = 100;

export { ISSUE_REPOSITORY };

// A request as its sender writes it. The reply's body shares the message's limits, so one schema serves both.
export const SupportMessage = requiredText('Write a message').max(MESSAGE_MAX_LENGTH, {
  error: `Keep the message to ${MESSAGE_MAX_LENGTH} characters`,
});

export const SupportRequestInput = z.object({
  about: z.enum(supportRequestAbout.enumValues, { error: 'Choose what this is about' }),
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
    .min(100, { error: 'That is not an HTTP status' })
    .max(599, { error: 'That is not an HTTP status' })
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
  about: z.enum(supportRequestAbout.enumValues, { error: 'Choose what this is about' }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, { error: 'That address is too long' })
    .pipe(z.email({ error: 'Enter an email address' })),
  subject: SupportRequestInput.shape.subject,
  message: SupportMessage,
  path: SupportRequestInput.shape.path,
  errorCode: SupportRequestInput.shape.errorCode,
  errorReference: z.string().trim().max(64, { error: 'That reference is too long' }).nullish(),
  website: z.string().nullish(),
});

export type SignedOutSupportRequestInput = z.input<typeof SignedOutSupportRequestInput>;
