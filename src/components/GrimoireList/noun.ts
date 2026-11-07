import type { SpellStatus } from '@/modules/grimoire';

export const nounOf = (status: SpellStatus): { one: string; other: string } =>
  status === 'draft' ? { one: 'draft', other: 'drafts' } : { one: 'spell', other: 'spells' };
