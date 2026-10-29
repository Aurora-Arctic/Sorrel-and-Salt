/** How many days an entry reads as New or Updated for. */
export const RECENT_DAYS = 30;

const WINDOW_MS = RECENT_DAYS * 24 * 60 * 60 * 1000;

export type EntryRecency = 'new' | 'updated';

/**
 * Whether a compendium entry is New (created in the last 30 days) or Updated (changed in them), New winning. Worked out at read from the two stamps the row
 * carries, so no column stores it and the marker lapses by itself. Exactly 30 days old is outside; `updated_at` moves only on a real change, so a no-op save earns none.
 */
export function entryRecency(
  createdAt: Date | string,
  updatedAt: Date | string,
  now: Date = new Date(),
): EntryRecency | null {
  const within = (at: Date | string) => now.getTime() - new Date(at).getTime() < WINDOW_MS;
  if (within(createdAt)) return 'new';
  if (within(updatedAt)) return 'updated';
  return null;
}
