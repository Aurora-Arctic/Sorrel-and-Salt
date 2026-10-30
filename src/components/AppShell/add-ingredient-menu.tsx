'use client';

import type { ReactElement } from 'react';
import { ChevronIcon } from '../IconTip/icons';
import MenuButton from '../MenuButton';
import type { MenuButtonItem, MenuSection } from '../MenuButton/types';
import type { AddDestination } from './types';

// The chevron beside Add Ingredient and its menu of places, drawn by MenuButton rather than a second
// hand-built menu; the chevron alone shows, its words hidden but still its name. With both kinds of place
// they are two labelled groups, otherwise a plain list (claude-docs/components/app-shell.md, "The Add Ingredient button").

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
    icon: <ChevronIcon className="menu-button__chevron" textSized />,
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
