import { useEffect } from 'react';

// A story that opens on a state a press reaches — a Delete question over its
// form, say — presses the button once the story is drawn, as a person would,
// rather than reaching into the component for a state it keeps to itself.
// Three stories wrote this effect by hand before MB.115.

/**
 * Presses the button named `name` now: the first whose text is `name`, or
 * whose `aria-label` is, for a button drawn as an icon. For a story that
 * presses several in turn, a frame apart; one press on mount is
 * `usePressOnMount`.
 */
export function press(name: string): void {
  [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.textContent === name || button.ariaLabel === name)
    ?.click();
}

/** Presses the button named `name`, as `press` finds it, once the story has mounted. */
export function usePressOnMount(name: string): void {
  useEffect(() => press(name), [name]);
}
