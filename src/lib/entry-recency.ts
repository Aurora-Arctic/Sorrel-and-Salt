export const RECENT_DAYS = 30;

const WINDOW_MS = RECENT_DAYS * 24 * 60 * 60 * 1000;

export type EntryRecency = 'new' | 'updated';

/** Worked out at read, so no column stores it and the marker lapses by itself. Exactly 30 days old is outside; `updated_at` moves only on a real change. */
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
