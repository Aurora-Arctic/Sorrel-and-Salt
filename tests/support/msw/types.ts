import type { ValidationIssue } from '@/lib/types';
import type { ErrorCode } from '@/graphql/types';

export interface MockedError {
  code: ErrorCode;
  /** VALIDATION only; each lands beside the input field its path names. */
  fieldErrors?: ValidationIssue[];
  /** STALE_WRITE only; the revision the row is at now, 1 when omitted. */
  currentRevision?: number;
  /** The service's message; the thrown type's default when omitted. */
  message?: string;
}
