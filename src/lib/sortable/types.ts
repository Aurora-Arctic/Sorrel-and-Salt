import type { UniqueIdentifier } from '@dnd-kit/core';

export interface SortableWording {
  nameOf: (id: UniqueIdentifier) => string | undefined;
  placeOf: (id: UniqueIdentifier) => string;
}
