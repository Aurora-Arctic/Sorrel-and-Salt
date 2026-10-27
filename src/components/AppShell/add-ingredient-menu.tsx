'use client';

import type { ReactElement } from 'react';
import MenuButton, { Chevron } from '../MenuButton';
import type { MenuButtonItem, MenuSection } from '../MenuButton/types';
import type { AddDestination } from './types';

// The chevron beside Add Ingredient and the menu of places it can go, drawn by
// MenuButton (the APG menu-button pattern: the focus moves to the first item,
// the arrows, Home and End rove, Escape and a press outside close) rather than
// a second hand-built menu (M14.27). The chevron alone shows, its words hidden
// but still its name. Where the viewer may add to both the compendium and a
// coven, the places are drawn in two labelled groups, the side they are on
// first (the owner's call, 2026-10-20); one kind of place is a plain list.
// claude-docs/components/app-shell.md, "Add Ingredient".

export default function AddIngredientMenu({
  sections,
  className,
  onChoose,
}: {
  /** The places in the order to draw them: two or more groups, or one, which is drawn flat. */
  sections: readonly MenuSection<AddDestination>[];
  className: string;
  onChoose: (destination: AddDestination) => void;
}): ReactElement {
  const itemsOf = (section: MenuSection<AddDestination>): MenuButtonItem[] =>
    section.items.map((destination) => ({
      key: destination.key,
      label: `to ${destination.name}`,
      onSelect: () => onChoose(destination),
    }));
  const shared = {
    label: 'Choose Where to Add',
    menuLabel: 'Add Ingredient To',
    icon: <Chevron />,
    className,
  };
  return sections.length < 2 ? (
    <MenuButton {...shared} items={sections.flatMap(itemsOf)} />
  ) : (
    <MenuButton
      {...shared}
      sections={sections.map((section) => ({
        key: section.key,
        label: section.label,
        items: itemsOf(section),
      }))}
    />
  );
}
