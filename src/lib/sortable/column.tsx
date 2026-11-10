/* oxlint-disable react/immutability -- dnd-kit calls these handlers after render, and they write the ref then, never while rendering */
'use client';

import {
  DndContext,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { type ReactElement, type ReactNode, useId } from 'react';
import {
  SORTABLE_INSTRUCTIONS,
  useKeyboardTarget,
  useSortableAnnouncements,
  useSortableSensors,
} from './index';

const COLUMN_KEYS = new Set(['ArrowUp', 'ArrowDown', 'Home', 'End']);

/**
 * A column of rows moved by a grip: pointer, touch and keyboard (arrows, Home and End), with the live region. `rows` of
 * unequal height set a row at its place's bottom going down, so it lands flush.
 */
export function SortableColumn({
  ids,
  names,
  onMove,
  unequalHeights = false,
  children,
}: {
  ids: readonly string[];
  names: readonly string[];
  onMove: (from: number, to: number) => void;
  unequalHeights?: boolean;
  children: ReactNode;
}): ReactElement {
  // dnd-kit numbers its regions from a module counter unless given an id, which a server render and the browser's would number apart.
  const id = useId();
  const indexOf = (key: UniqueIdentifier) => ids.indexOf(String(key));
  const { target, collisionDetection } = useKeyboardTarget();

  const coordinateGetter: KeyboardCoordinateGetter = (event, { context }) => {
    const { active, over, droppableRects } = context;
    if (!active || !COLUMN_KEYS.has(event.code)) return undefined;
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
    const own = droppableRects.get(active.id);
    if (place === undefined || !rect || (unequalHeights && !own)) return undefined;
    target.current = place;
    const down = to > indexOf(active.id);
    return {
      x: rect.left,
      y: unequalHeights && own && down ? rect.top + rect.height - own.height : rect.top,
    };
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
