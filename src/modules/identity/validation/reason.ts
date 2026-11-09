/** The most characters the reason on a role, access or invitation change holds, once trimmed. The ledger column has no database check. */
export const REASON_LIMIT = 500;

/** Whether a reason, trimmed as the server trims it, is past the limit. */
export const reasonTooLong = (reason: string): boolean => reason.trim().length > REASON_LIMIT;
