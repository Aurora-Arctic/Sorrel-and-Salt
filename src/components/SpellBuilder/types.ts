/** The builder's fields, M10.12's: what the spell is called, what it is for, and its jar. */
export type SpellBuilderField =
  'title' | 'intent' | 'jarSize' | 'sealWaxColor' | 'moonPhase' | 'dayOfWeek' | 'note';

/** The form's values: each field as typed, blank for none. */
export type SpellBuilderValues = Record<SpellBuilderField, string>;

/** A saved spell the builder opens, as the `spell` query answers it (M13.10). */
export type SpellBuilderSpell = {
  id: string;
  /** The revision it was read at, sent back with the next save as `expectedRevision`. */
  revision: number;
} & Record<SpellBuilderField, string | null>;

export interface SpellBuilderProps {
  /** The coven the spell is written in. */
  workspaceId: string;
  /** A saved spell to edit; left out, the builder opens empty and its first save creates one. */
  spell?: SpellBuilderSpell;
}
