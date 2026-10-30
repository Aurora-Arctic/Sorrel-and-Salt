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

// The dnd-kit setup every sortable list shares (the combobox's chips, the spell builder's steps): how a move starts, how a keyboard
// move picks its place, and what the live region says. Each list lays out its own items (claude-docs/components/combobox.md, "A sortable list").

/** What a handle's description says, read once its name has been. */
export const SORTABLE_INSTRUCTIONS =
  'Press Space or Enter to pick it up, the arrow keys to move it, and Space or Enter to put it down, or Escape to cancel.';

// Far enough that a press, which focuses the handle and opens its tooltip,
// is never taken for a drag.
const DRAG_DISTANCE_PX = 4;

// ---------------------------------------------------------------------------
// TOUCH DRAG DELAY: how long a finger must rest on a handle before a touch drag starts, and how far it may move first.
// Provisional; every sortable list reads the two numbers.
// ---------------------------------------------------------------------------
export const TOUCH_DRAG_DELAY_MS = 250;
/** How far, in pixels, a finger may move during that wait and still drag. */
export const TOUCH_DRAG_TOLERANCE_PX = 5;

/**
 * The pointer sensor for a mouse or a pen only: a finger also sends pointer
 * events, and the touch sensor, with its delay, answers those instead.
 */
class MouseAndPenSensor extends PointerSensor {
  static override activators = PointerSensor.activators.map(({ eventName, handler }) => ({
    eventName,
    handler: (...args: Parameters<typeof handler>) =>
      args[0].nativeEvent.pointerType !== 'touch' && handler(...args),
  }));
}

/** The keys that move a lifted item, besides those that lift and put it down. */
export const MOVE_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

/**
 * A mouse or pen, which drags once past a few pixels; a finger, which drags
 * once held for `TOUCH_DRAG_DELAY_MS`; and the keyboard, moving by
 * `coordinateGetter`.
 */
export function useSortableSensors(coordinateGetter: KeyboardCoordinateGetter) {
  return useSensors(
    useSensor(MouseAndPenSensor, { activationConstraint: { distance: DRAG_DISTANCE_PX } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_DRAG_DELAY_MS, tolerance: TOUCH_DRAG_TOLERANCE_PX },
    }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  );
}

/**
 * The place a key last moved the lifted item to, set by the list's coordinate getter and read by the collision detection: a keyboard
 * move is over the place its key chose, which items of different sizes would get wrong by nearest centre; a pointer's is over the nearest.
 */
export function useKeyboardTarget() {
  const target = useRef<UniqueIdentifier | null>(null);
  const collisionDetection: CollisionDetection = (args) =>
    args.pointerCoordinates === null && target.current !== null
      ? [{ id: target.current }]
      : closestCenter(args);
  return { target, collisionDetection };
}

/**
 * What the live region says at each step of a move: by the item's name and
 * its place, rather than dnd-kit's default, which names the id — a field
 * array's key means nothing to the person moving it.
 */
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
