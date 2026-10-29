import { useEffect } from 'react';

// A story that opens on a state a press reaches — a Delete question over its
// form, say — presses the button once the story is drawn, as a person would,
// rather than reaching into the component for a state it keeps to itself.

/**
 * Presses the button named `name` now: the first whose text or `aria-label` (for an icon button)
 * is `name`. One press on mount is `usePressOnMount`; several in turn is `useSteps`.
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

/**
 * Types `value` into `input` so React sees it: only the native setter followed by an `input`
 * event reaches `onChange`; setting `input.value` directly changes nothing React hears.
 */
export function setInputValue(input: HTMLInputElement, value: string): void {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Presses the last button named `name`: the confirm in a dialog opened over a same-named button, which `press` would find first. */
export function pressLast(name: string): void {
  [...document.querySelectorAll<HTMLButtonElement>('button')]
    .filter((button) => button.textContent === name || button.ariaLabel === name)
    .pop()
    ?.click();
}

/** Runs `steps` once the story has mounted, a short wait between each, as a person would. */
export function useSteps(steps: readonly (() => void)[], gap = 80): void {
  useEffect(() => {
    const timers = steps.map((step, i) => window.setTimeout(step, gap * (i + 1)));
    return () => timers.forEach(window.clearTimeout);
    // The steps are fixed for a story's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Submits the form holding `selector`, as Enter in a field does. */
export function submitForm(selector: string): void {
  document.querySelector<HTMLFormElement>(selector)?.requestSubmit();
}
