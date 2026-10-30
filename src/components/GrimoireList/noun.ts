import type { SpellStatus } from '@/modules/grimoire';

/** What a tab's spells are called in its sentence and its empty state: Spells lists spells, Drafts drafts. */
export const nounOf = (status: SpellStatus): { one: string; other: string } =>
  status === 'draft' ? { one: 'draft', other: 'drafts' } : { one: 'spell', other: 'spells' };
