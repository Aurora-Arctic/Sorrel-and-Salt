'use client';

import type { ReactElement } from 'react';
import { lazyModule, useLazyModule } from '../../lib/use-lazy-module';
import { ComboboxEntry } from './entry';
import type { ComboboxSortableEntriesProps } from './types';

// The ordered list's drag-and-drop, loaded apart from the page's first-load scripts. Until it arrives the
// chips draw as a plain list, so a form opened early shows the same entries
// (claude-docs/components/combobox.md, "A sortable list").

/** One import of the sortable list, shared by every ordered list and started early by the cards' Edit and Annotate. */
export const sortableModule = lazyModule(() => import('./sortable'));

export function LazySortableEntries(props: ComboboxSortableEntriesProps): ReactElement {
  const module = useLazyModule(sortableModule, true);
  if (module) return <module.ComboboxSortableEntries {...props} />;
  return (
    <ul className="combobox__entries">
      {props.entries.map(({ id, ...chip }) => (
        <ComboboxEntry key={id} {...chip} />
      ))}
    </ul>
  );
}
