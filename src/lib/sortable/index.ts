'use client';

import {
  type Announcements,
  closestCenter,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useRef } from 'react';
import type { SortableWording } from './types';

export type { SortableWording } from './types';

// Each list lays out its own items (claude-docs/components/combobox.md, "A sortable list").

export const SORTABLE_INSTRUCTIONS =
  'Press Space or Enter to pick it up, the arrow keys to move it, and Space or Enter to put it down, or Escape to cancel.';

// Far enough that a press, which focuses the handle and opens its tooltip,
// is never taken for a drag.
const DRAG_DISTANCE_PX = 4;

// Provisional: how long a finger rests on a handle before a touch drag starts.
export const TOUCH_DRAG_DELAY_MS = 250;
const TOUCH_DRAG_TOLERANCE_PX = 5;

/** A finger also sends pointer events; the touch sensor, with its delay, answers those instead. */
class MouseAndPenSensor extends PointerSensor {
  static override activators = PointerSensor.activators.map(({ eventName, handler }) => ({
    eventName,
    handler: (...args: Parameters<typeof handler>) =>
      args[0].nativeEvent.pointerType !== 'touch' && handler(...args),
  }));
}

export const MOVE_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

export function useSortableSensors(coordinateGetter: KeyboardCoordinateGetter) {
  return useSensors(
    useSensor(MouseAndPenSensor, { activationConstraint: { distance: DRAG_DISTANCE_PX } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_DRAG_DELAY_MS, tolerance: TOUCH_DRAG_TOLERANCE_PX },
    }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  );
}

/** A keyboard move is over the place its key chose, which items of different sizes would get wrong by nearest centre; a pointer's is over the nearest. */
export function useKeyboardTarget() {
  const target = useRef<UniqueIdentifier | null>(null);
  const collisionDetection: CollisionDetection = (args) =>
    args.pointerCoordinates === null && target.current !== null
      ? [{ id: target.current }]
      : closestCenter(args);
  return { target, collisionDetection };
}

/** By the item's name and place, not dnd-kit's default id: a field array's key means nothing to the person moving it. */
export function useSortableAnnouncements({ nameOf, placeOf }: SortableWording): Announcements {
  // Whether the lifted item has left its own place yet: dnd-kit reports it
  // over that place as soon as it is lifted, which would talk over the lift.
  const moved = useRef(false);
  return {
    onDragStart: ({ active }) => {
      moved.current = false;
      return `Picked up ${nameOf(active.id)}, at ${placeOf(active.id)}.`;
    },
    onDragOver: ({ active, over }) => {
      if (!moved.current && over?.id === active.id) return undefined;
      moved.current = true;
      return over
        ? `${nameOf(active.id)} moved to ${placeOf(over.id)}.`
        : `${nameOf(active.id)} is over no place in the list.`;
    },
    onDragEnd: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} put down at ${placeOf(over.id)}.`
        : `${nameOf(active.id)} put back at ${placeOf(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Move cancelled. ${nameOf(active.id)} is back at ${placeOf(active.id)}.`,
  };
}
