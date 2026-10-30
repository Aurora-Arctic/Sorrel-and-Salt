/** A coven the viewer may add to, as the plus's menu names it. */
export interface CompendiumCoven {
  id: string;
  name: string;
}

/** The plus, on a compendium card and beside the public entry page's pencil: adds the entry to a coven, via a menu where there are several. */
export interface AddIconProps {
  /** The default coven: added to at once where `covens` is empty. */
  workspaceId: string;
  /** The compendium entry's id. */
  ingredientId: string;
  /** Every coven the viewer may write in. */
  covens: readonly CompendiumCoven[];
  /** The ids of those that already hold the entry. */
  heldIn: readonly string[];
  /**
   * The names of every coven of the viewer's that holds the entry, any role:
   * counted on the plus and named in its tip. Left out or empty, neither shows.
   */
  holding?: readonly string[];
}

/**
 * The plus as drawn: its props and the entry's name as the card names it (`cardName`), which the
 * plus's accessible name carries after its tip. Apart from `AddIconProps` since a page reads the
 * covens and the name from different places.
 */
export interface NamedAddIconProps extends AddIconProps {
  /** The entry's name then its formal name: "Testwort, Formalis testis". */
  name: string;
}
