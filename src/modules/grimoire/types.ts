import type { spells } from './schema/spells';

/** `'private' | 'workspace'`, read off the column rather than restated. */
export type SpellVisibility = (typeof spells.$inferSelect)['visibility'];
