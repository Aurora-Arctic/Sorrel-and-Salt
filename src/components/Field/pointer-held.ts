'use client';

import { useRef, useSyncExternalStore } from 'react';

/**
 * Whether a pointer (mouse, pen or finger) is pressed down somewhere on the
 * page. A field's error is drawn when it is left, and pressing another
 * control leaves it on the press: the error line then pushes everything below
 * down before the button comes up, so the click lands on whatever slid under
 * it. `useSettledWhilePressed` keeps what is drawn as it was until the
 * release. Reserving room for the error line instead would leave a gap under
 * every field (claude-docs/components/field.md, "Errors wait for the pointer").
 */
let held = false;
const listeners = new Set<() => void>();

function set(next: boolean): void {
  if (held === next) return;
  held = next;
  listeners.forEach((listener) => listener());
}

const press = (): void => set(true);
const release = (): void => set(false);

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    document.addEventListener('pointerdown', press, true);
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
    window.addEventListener('blur', release);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      document.removeEventListener('pointerdown', press, true);
      document.removeEventListener('pointerup', release, true);
      document.removeEventListener('pointercancel', release, true);
      window.removeEventListener('blur', release);
      held = false;
    }
  };
}

/** True while a pointer press is in progress; false on the server. */
export function usePointerHeld(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => held,
    () => false,
  );
}

/**
 * `value` as it stood when the current press began, for as long as the press
 * lasts; `value` itself otherwise. What is drawn from it neither appears nor
 * goes while a button is down, so nothing moves under the pointer: an error
 * already showing stays, one just raised waits for the release. Merely hiding
 * errors during a press would take a showing one away and move the controls
 * the other way. The ref is written during the render, which is safe here
 * because the write is the value the render already has.
 */
export function useSettledWhilePressed<T>(value: T): T {
  const held = usePointerHeld();
  const settled = useRef(value);
  // oxlint-disable-next-line react/refs -- the ref is read once, in a state initialiser or after a held pointer, never to draw something else
  if (!held) settled.current = value;
  // oxlint-disable-next-line react/refs -- the ref is read once, in a state initialiser or after a held pointer, never to draw something else
  return settled.current;
}
