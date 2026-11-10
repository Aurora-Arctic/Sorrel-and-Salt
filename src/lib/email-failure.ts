import { normaliseEmail, validateEmailAddress } from './email-address';
import type { Failure } from './types';

/** The refusal a form shows beside its email field for an address that fails the address rule, or undefined for one that passes. */
export function emailFailure(email: string): Failure | undefined {
  const issue = validateEmailAddress(normaliseEmail(email));
  return issue ? { field: { name: 'email', message: issue.message } } : undefined;
}
