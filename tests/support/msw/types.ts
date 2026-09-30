import type { ValidationIssue } from '@/lib/types';
import type { ErrorCode } from '@/graphql/types';

export interface MockedError {
  code: ErrorCode;
  /** VALIDATION only; each lands beside the input field its path names. */
  fieldErrors?: ValidationIssue[];
  /** The service's message; the thrown type's default when omitted. */
  message?: string;
}
