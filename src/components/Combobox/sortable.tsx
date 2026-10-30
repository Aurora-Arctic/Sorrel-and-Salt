/* oxlint-disable react/immutability -- dnd-kit calls these handlers after render, and they write the ref then, never while rendering */
'use client';

import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, type SortingStrategy, useSortable } from '@dnd-kit/sortable';
import { type ReactElement, useId, useRef } from 'react';
import {
  MOVE_KEYS,
  SORTABLE_INSTRUCTIONS,
  useKeyboardTarget,
  useSortableAnnouncements,
  useSortableSensors,
} from '@/lib/sortable';
import { ComboboxEntry } from './entry';
import { flow, originOf, placeFor, shapeOf } from './flow';
import type { ComboboxSortableEntriesProps, ComboboxSortableEntry, FlowShape } from './types';

// A list whose order means something: its chips in the control, each moved by its handle, on dnd-kit's sortable preset; pointer and keyboard moves and the live region
// (claude-docs/components/combobox.md, "A sortable list").

/** One chip, given its place in the sortable list. */
function SortableEntry({ id, ...entry }: ComboboxSortableEntry): ReactElement {
  return <ComboboxEntry {...entry} sortable={useSortable({ id })} />;
}

export function ComboboxSortableEntries({
  entries,
  onMove,
}: ComboboxSortableEntriesProps): ReactElement {
  // dnd-kit numbers its regions from a module counter unless given an id, which a server render and the browser's would number apart.
  const id = useId();
  const ids = entries.map((entry) => entry.id);
  const indexOf = (key: UniqueIdentifier) => ids.indexOf(String(key));
  const valueOf = (key: UniqueIdentifier) => entries[indexOf(key)]?.value;
  const at = (key: UniqueIdentifier) => `position ${indexOf(key) + 1} of ${entries.length}`;
  const list = useRef<HTMLUListElement | null>(null);
  // The row's shape, measured as a move starts, while it is in progress.
  const shape = useRef<FlowShape | null>(null);
  // The place a key last moved the lifted chip to, which is what it is over.
  const { target, collisionDetection } = useKeyboardTarget();

  const widthsOf = (rects: { width: number }[], order: number[]) =>
    order.map((index) => rects[index]?.width ?? 0);

  /** The chips making way, each at the place the row lays it out, not onto another chip's box (see flow.ts). */
  const strategy: SortingStrategy = ({ rects, activeIndex, overIndex, index }) => {
    const rect = rects[index];
    if (!shape.current || !rect || rects.length === 0) return null;
    const order = arrayMove([...rects.keys()], activeIndex, overIndex);
    const slot = flow(widthsOf(rects, order), originOf(rects), shape.current)[order.indexOf(index)];
    if (!slot) return null;
    return { x: slot.left - rect.left, y: slot.top - rect.top, scaleX: 1, scaleY: 1 };
  };

  /** The keyboard's next place, chosen here rather than by dnd-kit's `sortableKeyboardCoordinates` (claude-docs/components/combobox.md, "A sortable list"). */
  const coordinateGetter: KeyboardCoordinateGetter = (event, { context }) => {
    const { active, over, droppableRects } = context;
    const row = shape.current;
    if (!MOVE_KEYS.has(event.code) || !active || !row) return undefined;
    // The arrows, Home and End would scroll the page as well.
    event.preventDefault();
    const rects = ids.map((key) => droppableRects.get(key));
    if (rects.some((rect) => rect === undefined)) return undefined;
    const placed = rects as NonNullable<(typeof rects)[number]>[];
    const origin = originOf(placed);
    const from = indexOf(active.id);
    const layout = (to: number) =>
      flow(widthsOf(placed, arrayMove([...placed.keys()], from, to)), origin, row);
    const here = indexOf(over?.id ?? active.id);
    const to = placeFor(event.code, here, layout(here));
    const slot = layout(to)[to];
    if (!slot) return undefined;
    target.current = ids[to] ?? null;
    return { x: slot.left, y: slot.top };
  };

  const sensors = useSortableSensors(coordinateGetter);

  const onDragStart = ({ active }: DragStartEvent) => {
    target.current = active.id;
    const element = list.current;
    shape.current = element
      ? shapeOf(
          element,
          [...element.children].map((chip) => chip.getBoundingClientRect()),
        )
      : null;
  };
  const settle = () => {
    target.current = null;
    shape.current = null;
  };

  const announcements = useSortableAnnouncements({ nameOf: valueOf, placeOf: at });

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
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={settle}
    >
      <SortableContext items={ids} strategy={strategy}>
        <ul ref={list} className="combobox__entries">
          {entries.map((entry) => (
            <SortableEntry key={entry.id} {...entry} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
