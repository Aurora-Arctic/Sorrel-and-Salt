import { act, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

// Moving a sortable list's chips (MB.170) in jsdom, which lays nothing out:
// dnd-kit finds where a chip may go from each chip's box, so the chips are
// given one, on one line, 100px apart and 80px wide, and their list a box
// as wide as the row it lays them out in.

/** Lays every chip out on one line, in its list's order; restore with `vi.restoreAllMocks`. */
export function layOutChips() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.classList.contains('combobox__entries')) return new DOMRect(0, 0, 10_000, 24);
    const chip = this.closest('.combobox__entry');
    if (!chip?.parentElement) return new DOMRect(0, 0, 0, 0);
    const at = Array.prototype.indexOf.call(chip.parentElement.children, chip);
    return new DOMRect(at * 100, 0, 80, 24);
  });
}

/**
 * Lays the chips out as the control's wrapping row does: each as wide as its
 * text, 8px a character and 40px for its grip and x, 4px apart, and onto a
 * new row, 32px down, once `rowWidth` is used up. Restore as `layOutChips`.
 */
export function wrapChips(rowWidth: number) {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.classList.contains('combobox__entries')) return new DOMRect(0, 0, rowWidth, 0);
    const chip = this.closest('.combobox__entry');
    if (!chip?.parentElement) return new DOMRect(0, 0, 0, 0);
    let x = 0;
    let y = 0;
    for (const sibling of chip.parentElement.children) {
      const text = sibling.querySelector('.combobox__entry-text')?.textContent ?? '';
      const width = text.length * 8 + 40;
      if (x > 0 && x + width > rowWidth) {
        x = 0;
        y += 32;
      }
      if (sibling === chip) return new DOMRect(x, y, width, 24);
      x += width + 4;
    }
    return new DOMRect(0, 0, 0, 0);
  });
}

// dnd-kit's keyboard sensor listens for the keys after a lift a task later,
// and measures between moves, so each step waits one out.
const tick = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

/** Presses `key` on the focused handle, as the sensor reads it, by its code. */
export async function press(handle: HTMLElement, key: string) {
  const code = key === ' ' ? 'Space' : key;
  fireEvent.keyDown(handle, { key, code });
  await tick();
}

/** Focuses `handle`, lifts it with Space, presses each arrow in turn, and drops it with Space. */
export async function moveByKeyboard(handle: HTMLElement, ...arrows: string[]) {
  act(() => handle.focus());
  await press(handle, ' ');
  for (const arrow of arrows) await press(handle, arrow);
  await press(handle, ' ');
}

/** Drags `handle` by pointer from its chip's middle to `x`, along the line the chips sit on. */
export async function dragByPointer(handle: HTMLElement, x: number) {
  const { left, width } = handle.getBoundingClientRect();
  const from = { clientX: left + width / 2, clientY: 12, isPrimary: true, button: 0 };
  fireEvent.pointerDown(handle, from);
  // Past the few pixels a press may wander before it counts as a drag.
  fireEvent.pointerMove(document, { ...from, clientX: from.clientX + 10 });
  await tick();
  fireEvent.pointerMove(document, { ...from, clientX: x });
  await tick();
  fireEvent.pointerUp(document, { ...from, clientX: x });
  // The sensor swallows every click for 50ms after a drag, so that the drop
  // presses nothing; waited out, so that it swallows no later test's.
  await act(() => new Promise<void>((resolve) => setTimeout(resolve, 60)));
}
