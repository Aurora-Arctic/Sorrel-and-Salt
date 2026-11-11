import { limitMessage } from '../../../lib/formats';
import { PAUSE_TEXT_MAX_LENGTH } from '../../../lib/pause-message';

/** The most characters the reason on a role, access or invitation change holds, once trimmed. The ledger column has no database check. */
export const REASON_LIMIT = PAUSE_TEXT_MAX_LENGTH;

/** Whether a reason, trimmed as the server trims it, is past the limit. */
export const reasonTooLong = (reason: string): boolean => reason.trim().length > REASON_LIMIT;

/** What is wrong with a reason, if anything: past the limit, in the schema's words. */
export const reasonProblem = (reason: string): string | undefined =>
  reasonTooLong(reason) ? limitMessage(REASON_LIMIT) : undefined;
