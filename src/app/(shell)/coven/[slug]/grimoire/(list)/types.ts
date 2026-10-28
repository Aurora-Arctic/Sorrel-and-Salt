import type { SpellStatus } from '@/modules/grimoire';

export interface GrimoireTabParams {
  // Both are promises in Next 16: awaited before use.
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Which tab is drawing: its status, and its address beneath the coven's grimoire. */
export interface GrimoireTabProps extends GrimoireTabParams {
  status: SpellStatus;
  /** '' for Spells, the grimoire itself; '/drafts' for Drafts. */
  beneath: '' | '/drafts';
}

/** New Spell's press, which draws the dialog's head at once, naming the coven the spell lands in. */
export interface NewSpellActionProps {
  covenName: string;
}
