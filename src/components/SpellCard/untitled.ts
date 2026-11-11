/** The name shown for a spell with no title. Its own file so a caller needs none of the card to read it. */
export const UNTITLED_SPELL = 'Untitled Spell';

/** The name shown for a spell: its title, trimmed, or the untitled name when the title is blank. */
export const spellNameOf = (title: string | null | undefined): string =>
  title?.trim() || UNTITLED_SPELL;
