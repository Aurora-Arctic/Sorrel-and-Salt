'use client';

import { useRef, useSyncExternalStore } from 'react';

/**
 * Whether a pointer is pressed down on the page. A field error drawn on a press would shift the button before the click lands, so
 * `useSettledWhilePressed` holds what is drawn until release (claude-docs/components/field.md, "Errors wait for the pointer").
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
 * `value` as it stood when the current press began, for as long as it lasts; `value` otherwise. The ref is written during render, which is safe
 * because the write is the value the render already has (claude-docs/components/field.md, "Errors wait for the pointer").
 */
export function useSettledWhilePressed<T>(value: T): T {
  const held = usePointerHeld();
  const settled = useRef(value);
  // oxlint-disable-next-line react/refs -- the ref is read once, in a state initialiser or after a held pointer, never to draw something else
  if (!held) settled.current = value;
  // oxlint-disable-next-line react/refs -- the ref is read once, in a state initialiser or after a held pointer, never to draw something else
  return settled.current;
}
