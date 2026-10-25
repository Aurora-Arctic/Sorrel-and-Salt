import type { spells } from './schema/spells';

/** `'draft' | 'complete'`, read off the column rather than restated. */
export type SpellStatus = (typeof spells.$inferSelect)['status'];

/** `'private' | 'workspace'`, read off the column rather than restated. */
export type SpellVisibility = (typeof spells.$inferSelect)['visibility'];
