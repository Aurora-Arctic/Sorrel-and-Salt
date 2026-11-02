// The provisional-cleanup job's paging, apart from the service so the workflow bundle reads it without the database code.

/** How many account ids one page holds: the most the job reads at once, and the most one batch run deletes. */
export const CLEANUP_PAGE_SIZE = 500;
