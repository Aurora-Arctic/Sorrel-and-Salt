/* oxlint-disable react/immutability -- dnd-kit calls these handlers after render, and they write the ref then, never while rendering */
'use client';

import {
  DndContext,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, type ReactElement, type ReactNode, useId } from 'react';
import {
  SORTABLE_INSTRUCTIONS,
  useKeyboardTarget,
  useSortableAnnouncements,
  useSortableSensors,
} from '@/lib/sortable';
import { GripIcon } from '../Combobox/icons';

// The help outline's three sortable lists (the guides in Reorder Mode, a guide's sub pages, the FAQ), each a column of rows
// moved by a grip on the dnd-kit setup of `src/lib/sortable` (claude-docs/components/help-outline.md, "Ordering").

const ROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'Home', 'End']);

export function HelpSortable({
  ids,
  names,
  onMove,
  children,
}: {
  ids: readonly string[];
  names: readonly string[];
  onMove: (from: number, to: number) => void;
  children: ReactNode;
}): ReactElement {
  // dnd-kit numbers its regions from a module counter unless given an id, which a server render and the browser's would number apart.
  const id = useId();
  const indexOf = (key: UniqueIdentifier) => ids.indexOf(String(key));
  const { target, collisionDetection } = useKeyboardTarget();

  const coordinateGetter: KeyboardCoordinateGetter = (event, { context }) => {
    const { active, over, droppableRects } = context;
    if (!active || !ROW_KEYS.has(event.code)) return undefined;
    // The arrows, Home and End would scroll the page as well.
    event.preventDefault();
    const last = ids.length - 1;
    const here = indexOf(over?.id ?? active.id);
    const to =
      event.code === 'Home'
        ? 0
        : event.code === 'End'
          ? last
          : Math.min(last, Math.max(0, here + (event.code === 'ArrowUp' ? -1 : 1)));
    const place = ids[to];
    const rect = place === undefined ? undefined : droppableRects.get(place);
    if (place === undefined || !rect) return undefined;
    target.current = place;
    return { x: rect.left, y: rect.top };
  };

  const sensors = useSortableSensors(coordinateGetter);
  const announcements = useSortableAnnouncements({
    nameOf: (key) => names[indexOf(key)],
    placeOf: (key) => `position ${indexOf(key) + 1} of ${ids.length}`,
  });
  const settle = () => {
    target.current = null;
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    settle();
    if (over && active.id !== over.id) onMove(indexOf(active.id), indexOf(over.id));
  };

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: SORTABLE_INSTRUCTIONS },
      }}
      onDragStart={({ active }) => {
        target.current = active.id;
      }}
      onDragEnd={onDragEnd}
      onDragCancel={settle}
    >
      <SortableContext items={[...ids]} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

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
