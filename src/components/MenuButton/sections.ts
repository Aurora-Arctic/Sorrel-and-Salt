import type { MenuButtonItem, MenuSection } from './types';

/** Where the viewer is, which decides the section that comes first: the compendium's or the coven's. */
export type Viewing = 'compendium' | 'coven';

/**
 * The two sections a menu draws when it holds both the compendium's choices and the coven's,
 * the viewer's own side first: the compendium's on the public compendium and the admin pages,
 * the coven's on a coven's. The caller says where the viewer is (`viewing`), since the menu
 * reads no address. A side with nothing to offer is left out, so a menu of one kind has one
 * section: a More menu draws it labelled (`choicesFor`), and the bar's Add Ingredient menu
 * draws it flat. Generic over the item so both menus, with items of their own, share it.
 */
export function sectionsFor<Item>(
  choices: { compendium: readonly Item[]; coven: readonly Item[] },
  viewing: Viewing,
): MenuSection<Item>[] {
  const compendium = { key: 'compendium', label: 'Compendium', items: choices.compendium };
  const coven = { key: 'coven', label: 'Coven', items: choices.coven };
  return (viewing === 'compendium' ? [compendium, coven] : [coven, compendium]).filter(
    ({ items }) => items.length > 0,
  );
}

/**
 * What a More menu is given for its items of both kinds: always the labelled sections, the
 * viewer's side first, even where only one side has items, so a card's dots, whose choices
 * are all the coven's, still show a lone "Coven" section under its discreet label; an empty
 * side is left out. A menu never holds a single choice: a caller whose one choice is a Remove
 * or Delete draws the bin instead and does not come here. Not for the bar's Add Ingredient
 * menu, which keeps a plain list for one kind of place.
 */
export function choicesFor(
  choices: { compendium: readonly MenuButtonItem[]; coven: readonly MenuButtonItem[] },
  viewing: Viewing,
): { sections: MenuSection[]; items?: never } {
  return { sections: sectionsFor(choices, viewing) };
}
