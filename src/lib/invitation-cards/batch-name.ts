/** A batch's short name: the first block of its id, enough to tell two apart on a page and in the sign-ups CSV. */
export const batchName = (batchId: string): string => batchId.slice(0, 8);
