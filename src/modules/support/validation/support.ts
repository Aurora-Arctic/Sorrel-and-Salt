import { z } from 'zod';
import {
  ERROR_DETAIL_MAX_LENGTH,
  ERROR_REFERENCE_MAX_LENGTH,
  ISSUE_LINK_EXPECTED,
  ISSUE_REPOSITORY,
  PAGE_NOT_ON_SITE,
  isSitePage,
  normaliseIssueLink,
} from '../../../lib/support-path';
import { EMAIL_MAX_LENGTH } from '../../../lib/email-address';
import {
  PATH_TOO_LONG,
  SUBJECT_REQUIRED,
  MESSAGE_REQUIRED,
  ABOUT_REQUIRED,
} from '../../../lib/support-messages';
import { limitMessage, trimEnds } from '../../../lib/formats';
import { limitedText } from '../../../lib/validation';
import { supportRequestAbout } from '../schema/support-requests';

import {
  HTTP_STATUS_MAX,
  HTTP_STATUS_MIN,
  MESSAGE_MAX_LENGTH,
  PATH_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
} from './limits';

export {
  ERROR_DETAIL_MAX_LENGTH,
  ERROR_REFERENCE_MAX_LENGTH,
  ISSUE_REPOSITORY,
  MESSAGE_MAX_LENGTH,
  PATH_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
};

// A request as its sender writes it. The reply's body shares the message's limits, so one schema serves both.
export const SupportMessage = limitedText(MESSAGE_REQUIRED, MESSAGE_MAX_LENGTH, trimEnds);

const About = z.enum(supportRequestAbout.enumValues, { error: ABOUT_REQUIRED });

export const SupportRequestInput = z.object({
  about: About,
  subject: limitedText(SUBJECT_REQUIRED, SUBJECT_MAX_LENGTH),
  message: SupportMessage,
  path: z
    .string()
    .max(PATH_MAX_LENGTH, { error: PATH_TOO_LONG })
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
  errorDetail: z
    .string()
    .trim()
    .max(ERROR_DETAIL_MAX_LENGTH, { error: limitMessage(ERROR_DETAIL_MAX_LENGTH) })
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
  errorDetail: SupportRequestInput.shape.errorDetail,
  website: z.string().nullish(),
});

export type SignedOutSupportRequestInput = z.input<typeof SignedOutSupportRequestInput>;
