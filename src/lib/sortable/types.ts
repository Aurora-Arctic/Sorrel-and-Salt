import type { UniqueIdentifier } from '@dnd-kit/core';

/** How a sortable list names its items to the live region. */
export interface SortableWording {
  /** The item's name as the person reads it, never its key. */
  nameOf: (id: UniqueIdentifier) => string | undefined;
  /** Its place: "position 2 of 5". */
  placeOf: (id: UniqueIdentifier) => string;
}
