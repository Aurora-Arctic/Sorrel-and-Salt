import { useEffect } from 'react';

// A story that opens on a state a press reaches — a Delete question over its
// form, say — presses the button once the story is drawn, as a person would,
// rather than reaching into the component for a state it keeps to itself.
// Three stories wrote this effect by hand before MB.115.

/**
 * Presses the button named `name` once the story has mounted: the first whose
 * text is `name`, or whose `aria-label` is, for a button drawn as an icon.
 */
export function usePressOnMount(name: string): void {
  useEffect(() => {
    [...document.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === name || button.ariaLabel === name)
      ?.click();
  }, [name]);
}
