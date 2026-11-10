import { z } from 'zod';
import { normaliseEmail, validateEmailAddress } from './email-address';

/** The one zod schema for an address in a form or a request; its output is the normalised address. */
export const EmailAddress = z
  .string()
  .transform(normaliseEmail)
  .superRefine((email, ctx) => {
    const issue = validateEmailAddress(email);
    if (issue) ctx.addIssue({ code: 'custom', message: issue.message });
  });
