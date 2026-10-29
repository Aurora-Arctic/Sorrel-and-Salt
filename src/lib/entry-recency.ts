/** How many days an entry reads as New or Updated for. */
export const RECENT_DAYS = 30;

const WINDOW_MS = RECENT_DAYS * 24 * 60 * 60 * 1000;

export type EntryRecency = 'new' | 'updated';

/**
 * Whether a compendium entry is New (created inside the last 30 days) or
 * Updated (changed inside them), New winning when both hold. Worked out when
 * the page is read, from the two stamps the row already carries: no column
 * stores it and no job clears it, so the marker lapses by itself. A date
 * exactly 30 days old is outside the window. `updated_at` moves only on a real
 * change (migration 0079), so a save that changed nothing earns no marker.
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
