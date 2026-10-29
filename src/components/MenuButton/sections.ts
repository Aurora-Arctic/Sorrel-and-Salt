import type { MenuButtonItem, MenuSection } from './types';

/** Where the viewer is, which decides the section that comes first: the compendium's or the coven's. */
export type Viewing = 'compendium' | 'coven';

/**
 * The compendium and coven sections of a menu, the viewer's own side first (the caller gives `viewing`); an empty side is left out. Generic over the item.
 * (claude-docs/components/menu-button.md, "Notes from code comments: menu sections").
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
 * What a More menu is given: always the labelled sections, the viewer's side first, with an empty side left out; not for the bar's Add Ingredient menu
 * (claude-docs/components/menu-button.md, "Notes from code comments: More menu sections").
 */
export function choicesFor(
  choices: { compendium: readonly MenuButtonItem[]; coven: readonly MenuButtonItem[] },
  viewing: Viewing,
): { sections: MenuSection[]; items?: never } {
  return { sections: sectionsFor(choices, viewing) };
}
