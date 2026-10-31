import { z } from 'zod';
import { requiredText } from '../../../lib/validation';
import { supportRequestAbout } from '../schema/support-requests';

export const SUBJECT_MAX_LENGTH = 120;
export const MESSAGE_MAX_LENGTH = 4000;
export const PATH_MAX_LENGTH = 500;

/** The repository whose issues an admin may attach to a request. */
export const ISSUE_REPOSITORY = 'Aurora-Arctic/Sorrel-and-Salt';

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
  path: z.string().max(PATH_MAX_LENGTH, { error: 'That page address is too long' }).nullish(),
  errorCode: z
    .number()
    .int()
    .min(100, { error: 'That is not an HTTP status' })
    .max(599, { error: 'That is not an HTTP status' })
    .nullish(),
});

export type SupportRequestInput = z.input<typeof SupportRequestInput>;

/** The pattern of an issue's address on the repository: `https://github.com/<repository>/issues/<number>`, nothing after. */
const ISSUE_URL = new RegExp(`^https://github\\.com/${ISSUE_REPOSITORY}/issues/[1-9][0-9]*$`);

export const IssueUrlInput = z
  .string()
  .trim()
  .regex(ISSUE_URL, { error: `Give the address of an issue on ${ISSUE_REPOSITORY}` });

/** The topics a visitor with no account may write about: the two whose problem can keep them from signing in. */
export const SIGNED_OUT_ABOUTS = ['accessibility', 'account'] as const;

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
