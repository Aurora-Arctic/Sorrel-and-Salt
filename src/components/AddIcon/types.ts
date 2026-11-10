export interface CompendiumCoven {
  id: string;
  name: string;
}

export interface AddIconProps {
  workspaceId: string;
  ingredientId: string;
  covens: readonly CompendiumCoven[];
  heldIn: readonly string[];
  holding?: readonly string[];
}

/**
 * The plus as drawn: its props and the entry's name as the card names it (`cardName`), which the
 * plus's accessible name carries after its tip. Apart from `AddIconProps` since a page reads the
 * covens and the name from different places.
 */
export interface NamedAddIconProps extends AddIconProps {
  name: string;
}
