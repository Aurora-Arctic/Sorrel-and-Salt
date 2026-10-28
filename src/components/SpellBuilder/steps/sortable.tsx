'use client';

import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { type ReactElement, useId } from 'react';
import {
  SORTABLE_INSTRUCTIONS,
  useKeyboardTarget,
  useSortableAnnouncements,
  useSortableSensors,
} from '@/lib/sortable';
import type { SortableStepsProps } from './types';

// The jar's steps in their order (M10.16, story 51): each moved by its handle,
// on the dnd-kit setup the combobox's chips use (src/lib/sortable), in a
// column of its own. The pointer drags a step onto another's place; the
// keyboard lifts it with Space or Enter, moves it a place with Up and Down, or
// to either end with Home and End, and puts it down with Space or Enter, or
// back with Escape. Each step is said in dnd-kit's live region and the focus
// stays on the moved step's handle. See claude-docs/components/spell-builder.md,
// "Reordering".

/** The keys that move a lifted step: a column has no Left or Right. */
const STEP_KEYS = new Set(['ArrowUp', 'ArrowDown', 'Home', 'End']);

export function SortableSteps({ ids, names, onMove, children }: SortableStepsProps): ReactElement {
  // dnd-kit numbers its regions from a module counter unless given an id,
  // which a server render and the browser's would number apart.
  const id = useId();
  const indexOf = (key: UniqueIdentifier) => ids.indexOf(String(key));
  const { target, collisionDetection } = useKeyboardTarget();

  /**
   * The keyboard's next place: the step above or below the place the lifted
   * step is over, or either end, and no further. The step is set where it
   * will sit there: at that place's top going up, and with its bottom at that
   * place's bottom going down, since steps differ in height.
   */
  const coordinateGetter: KeyboardCoordinateGetter = (event, { context }) => {
    const { active, over, droppableRects } = context;
    if (!active || !STEP_KEYS.has(event.code)) return undefined;
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
    if (place === undefined || !rect || !own) return undefined;
    target.current = place;
    const down = to > indexOf(active.id);
    return { x: rect.left, y: down ? rect.top + rect.height - own.height : rect.top };
  };

  const sensors = useSortableSensors(coordinateGetter);
  const announcements = useSortableAnnouncements({
    nameOf: (key) => names[indexOf(key)],
    placeOf: (key) => `position ${indexOf(key) + 1} of ${ids.length}`,
  });

  const onDragStart = ({ active }: DragStartEvent) => {
    target.current = active.id;
  };
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
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={settle}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className="spell-steps__list" aria-label="Steps">
          {children}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
