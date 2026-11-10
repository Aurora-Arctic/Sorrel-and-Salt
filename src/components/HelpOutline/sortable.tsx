'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, type ReactElement } from 'react';
import { GripIcon } from '../Combobox/icons';

// The help outline's three sortable lists (the guides in Reorder Mode, a guide's sub pages, the FAQ), each a column of rows
// moved by a grip on the dnd-kit setup of `src/lib/sortable` (claude-docs/components/help-outline.md, "Ordering").

/** One row's sortable state: the node to move, its moving style, and the grip that moves it. */
export function useHelpSortableRow(
  id: string,
  name: string,
  disabled = false,
): {
  setNodeRef: (node: HTMLElement | null) => void;
  style: CSSProperties;
  dragging: boolean;
  grip: ReactElement;
} {
  const sortable = useSortable({ id, disabled });
  const { setActivatorNodeRef, listeners, attributes } = sortable;
  // The grip is a button already; dnd-kit's role would make it a second one.
  const { role: _role, ...rest } = attributes;
  return {
    setNodeRef: sortable.setNodeRef,
    style: {
      transform: CSS.Translate.toString(sortable.transform),
      transition: sortable.transition,
    },
    dragging: sortable.isDragging,
    grip: (
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="help-outline__grip"
        {...rest}
        {...listeners}
        disabled={disabled}
        aria-label={`Move ${name}`}
      >
        <GripIcon />
      </button>
    ),
  };
}
