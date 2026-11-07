import type { RetentionStage } from '../types';

// The support-retention job's paging, apart from the service so the workflow bundle reads it without the database code.

/** How many request ids one page holds: the most the job reads at once, and the most one batch run takes. */
export const RETENTION_PAGE_SIZE = 500;

export const RETENTION_STAGES: readonly RetentionStage[] = ['notice', 'close', 'anonymise'];
