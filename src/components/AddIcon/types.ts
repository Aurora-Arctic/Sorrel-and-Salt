/** A coven the viewer may add to, as the plus's menu names it. */
export interface CompendiumCoven {
  id: string;
  name: string;
}

/** The plus, on a compendium card and beside the public entry page's pencil: add this entry to a coven, a menu of the covens where there are several. */
export interface AddIconProps {
  /** The default coven: added to at once where `covens` is empty. */
  workspaceId: string;
  /** The compendium entry's id. */
  ingredientId: string;
  /** Every coven the viewer may write in. */
  covens: readonly CompendiumCoven[];
  /** The ids of those that already hold the entry. */
  heldIn: readonly string[];
}
