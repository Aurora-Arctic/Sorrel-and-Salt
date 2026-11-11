'use client';

import { lazyComponent, lazyModule } from '../../lib/use-lazy-module';
import { ComboboxEntry } from './entry';

// The ordered list's drag-and-drop, loaded apart from the page's first-load scripts. Until it arrives the
// chips draw as a plain list, so a form opened early shows the same entries
// (claude-docs/components/combobox.md, "A sortable list").

/** One import of the sortable list, shared by every ordered list and started early by the cards' Edit and Annotate. */
export const sortableModule = lazyModule(() =>
  import('./sortable').then((loaded) => ({ default: loaded.ComboboxSortableEntries })),
);

export const LazySortableEntries = lazyComponent(sortableModule, {
  fallback: ({ entries }) => (
    <ul className="combobox__entries">
      {entries.map(({ id, ...chip }) => (
        <ComboboxEntry key={id} {...chip} />
      ))}
    </ul>
  ),
});
