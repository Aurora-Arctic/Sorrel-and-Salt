import type { CSSProperties } from 'react';

// The room the text keeps after a list's chips: as wide as the placeholder,
// so the prompt for the next value shows whole, or wraps onto a row of its
// own under the chips, rather than being cut to a few letters (the owner's
// call at MB.115's review). `ch` is a digit's width, a little wider than the
// average letter, so the room errs wide. Without chips the text has the row
// to itself and needs none; a qualified box sizes itself to its text.

/** The slot's `--combobox-room`, set only beside chips and only for a placeholder. */
export function chipsRoom(
  beside: boolean,
  placeholder: string | undefined,
): CSSProperties | undefined {
  if (!beside || !placeholder) return undefined;
  return { '--combobox-room': `${placeholder.length + 1}ch` } as CSSProperties;
}
