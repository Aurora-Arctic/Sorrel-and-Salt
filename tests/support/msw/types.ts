import type { HeldBy, ValidationIssue } from '@/lib/types';
import type { ErrorCode } from '@/graphql/types';

export interface MockedError {
  code: ErrorCode;
  /** VALIDATION only; each lands beside the input field its path names. */
  fieldErrors?: ValidationIssue[];
  /** STALE_WRITE only; the revision the row is at now, 1 when omitted. */
  currentRevision?: number;
  /** RATE_LIMITED only; the seconds a Retry-After header names, 60 when omitted. */
  retryAfterSeconds?: number;
  /** ACCESS_PAUSED only; when the pause ends, `null` (the default) for none. */
  pausedUntil?: Date | null;
  /** IN_USE only; the compendium list's filter for the entries holding the row, none when omitted. */
  heldBy?: HeldBy;
  /** The service's message; the thrown type's default when omitted. */
  message?: string;
}
