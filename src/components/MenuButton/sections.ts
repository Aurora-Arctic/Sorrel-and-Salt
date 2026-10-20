import type { MenuButtonChoices, MenuButtonItem, MenuSection } from './types';

/** Where the viewer is, which decides the section that comes first: the compendium's or the coven's. */
export type Viewing = 'compendium' | 'coven';

/**
 * The two sections a menu draws when it holds both the compendium's choices and the coven's
 * (the owner's call, 2026-10-20), the viewer's own side first: the compendium's on the public
 * compendium and the admin pages, the coven's on a coven's. The caller says where the viewer is
 * (`viewing`), since the menu reads no address. A side with nothing to offer is left out, so a
 * menu of one kind has one section, which the caller then draws flat. Generic over the item so
 * the entry page's More and the bar's Add Ingredient menu, with items of their own, share it.
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
 * What a MenuButton is given for items of both kinds: the two sections where both have items,
 * the viewer's side first, and the plain list where only one does, since a heading over the
 * only group would label nothing. A menu that mixes today only for a curator who is also a
 * coven's member (the compendium's Edit among the coven's choices).
 */
export function choicesFor(
  choices: { compendium: readonly MenuButtonItem[]; coven: readonly MenuButtonItem[] },
  viewing: Viewing,
): MenuButtonChoices {
  const sections = sectionsFor(choices, viewing);
  return sections.length > 1 ? { sections } : { items: sections[0]?.items ?? [] };
}
