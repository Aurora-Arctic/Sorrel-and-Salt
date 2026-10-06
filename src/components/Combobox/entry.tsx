'use client';

import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import type { ComboboxEntryProps } from './types';

// An entry a list holds, inside the control: its text, and the x that takes
// it out. A text too long for the control is cut off with an ellipsis, and
// shown whole in a tooltip while the entry is hovered or its x has focus —
// only when it is cut off, and closed by Escape (WCAG 1.4.13). An entry with
// a detail always has something to show, so its tooltip opens whether the
// text fits or not (MB.164). Moved here from IngredientForm (MB.133) so that
// every list draws the same entry (claude-docs/components/combobox.md, "An
// entry").

// Long enough to cross from the chip onto its tooltip.
const TIP_CLOSE_DELAY_MS = 150;

export function ComboboxEntry({
  value,
  errorId,
  detail,
  onRemove,
}: ComboboxEntryProps): ReactElement {
  const text = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  const detailId = useId();
  // Measured as it opens rather than watched: whether the text fits changes
  // with the control's width, and only matters at the moment someone looks.
  const show = () => {
    clearTimeout(closing.current);
    const element = text.current;
    if (detail || (element && element.scrollWidth > element.clientWidth)) setOpen(true);
  };
  const hide = () => {
    clearTimeout(closing.current);
    setOpen(false);
  };
  // As InfoTip's: long enough for the pointer to cross from the chip onto the
  // tooltip above it, whose hover keeps it open.
  const hideSoon = () => {
    clearTimeout(closing.current);
    closing.current = setTimeout(() => setOpen(false), TIP_CLOSE_DELAY_MS);
  };

  useEffect(() => () => clearTimeout(closing.current), []);

  useEffect(() => {
    if (!open) return;
    // On the document: a tooltip opened by hover has no focus to listen from.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <li className={errorId ? 'combobox__entry is-invalid' : 'combobox__entry'}>
      {/* Hover on a wrapper holding the tooltip as well as the text, so the
          pointer can move onto the tooltip without closing it. */}
      <span className="combobox__entry-label" onMouseEnter={show} onMouseLeave={hideSoon}>
        <span ref={text} className="combobox__entry-text">
          {value}
        </span>
        {/* In the page while closed, faded out and aria-hidden, so it fades
            both ways as InfoTip's does. */}
        <span
          role="tooltip"
          className={open ? 'combobox__entry-tip is-open' : 'combobox__entry-tip'}
          aria-hidden={!open}
        >
          {value}
          {/* Referenced by the x below, so read although the tooltip is
              aria-hidden while closed. */}
          {detail && (
            <span id={detailId} className="combobox__entry-detail">
              {detail}
            </span>
          )}
        </span>
      </span>
      {/* Named for its entry: a column of bare "Remove"s is no help to a
          screen reader. In the tab order, a 24px target, and described by
          the list's error when the error names this entry, then by the
          entry's detail. */}
      <button
        type="button"
        className="combobox__entry-remove"
        aria-label={`Remove ${value}`}
        aria-describedby={[errorId, detail && detailId].filter(Boolean).join(' ') || undefined}
        onFocus={show}
        onBlur={hide}
        onClick={onRemove}
      >
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}
