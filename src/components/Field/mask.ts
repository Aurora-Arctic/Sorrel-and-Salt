import { useRef } from 'react';
import type { FieldMask } from '../../lib/formats';

// Formatting while the person types (claude-docs/components/field.md, "Masks").

export type Deletion = 'backward' | 'forward' | null;

export interface MaskEdit {
  /** What the control held before this edit. */
  previous: string;
  /** What it holds now, before the mask has touched it. */
  text: string;
  /** The caret in `text`. */
  caret: number;
  deletion: Deletion;
}

export interface MaskedText {
  value: string;
  caret: number;
}

const count = (mask: FieldMask, text: string): number =>
  [...text].filter(mask.isSignificant).length;

/** Where the nth significant character of `text` is (-1 when there are fewer). */
function indexOfSignificant(mask: FieldMask, text: string, nth: number): number {
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (mask.isSignificant(text[i])) {
      seen += 1;
      if (seen === nth) return i;
    }
  }
  return -1;
}

/**
 * Lays an edit out through the mask and finds the caret. The caret is kept by counting the characters
 * the person typed before it, because the mask moves the others. A deletion that removed only
 * characters the mask had added (a bracket, a space) removes the typed character beside them too, or
 * the mask would put them straight back and Backspace would stick.
 */
export function applyMask(
  mask: FieldMask,
  { previous, text, caret, deletion }: MaskEdit,
): MaskedText {
  let typed = text;
  let before = count(mask, typed.slice(0, caret));
  if (deletion && count(mask, typed) === count(mask, previous)) {
    if (deletion === 'backward' && before > 0) {
      const at = indexOfSignificant(mask, typed, before);
      typed = typed.slice(0, at) + typed.slice(at + 1);
      before -= 1;
    } else if (deletion === 'forward') {
      const at = indexOfSignificant(mask, typed, before + 1);
      if (at >= 0) typed = typed.slice(0, at) + typed.slice(at + 1);
    }
  }
  const value = mask.format(typed);
  if (before >= count(mask, value)) return { value, caret: value.length };
  const at = indexOfSignificant(mask, value, before);
  return { value, caret: before === 0 ? 0 : at + 1 };
}

function deletionOf(event: Event, previous: string, text: string): Deletion {
  const type = (event as InputEvent).inputType;
  if (type?.startsWith('delete')) return type.includes('Forward') ? 'forward' : 'backward';
  return type === undefined && text.length < previous.length ? 'backward' : null;
}

/**
 * The change handler a text control wraps its own with. It rewrites the control's value and caret in
 * place before anyone reads the event, so react-hook-form and a plain `onChange` both see the masked
 * text. `onFocus` records what the control holds, to tell a deletion from a paste.
 */
export function useMask(mask: FieldMask | undefined) {
  const previous = useRef('');
  return {
    onFocus: (event: { target: HTMLInputElement | HTMLTextAreaElement }) => {
      previous.current = event.target.value;
    },
    mask: (event: {
      target: HTMLInputElement | HTMLTextAreaElement;
      nativeEvent?: Event;
    }): void => {
      if (!mask) return;
      const control = event.target;
      const { value, caret } = applyMask(mask, {
        previous: previous.current,
        text: control.value,
        caret: control.selectionStart ?? control.value.length,
        deletion: deletionOf(
          event.nativeEvent ?? new Event('input'),
          previous.current,
          control.value,
        ),
      });
      if (value !== control.value) control.value = value;
      control.setSelectionRange(caret, caret);
      previous.current = value;
    },
  };
}
