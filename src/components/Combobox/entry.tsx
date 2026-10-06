'use client';

import { type ReactElement, useId, useRef } from 'react';
import { useTip } from './tip';
import type { ComboboxEntryProps } from './types';

// An entry a list holds, inside the control: its text, and the x that takes
// it out. A text too long for the control is cut off with an ellipsis, and
// shown whole in a tooltip while the entry is hovered or its x has focus —
// only when it is cut off, and closed by Escape (WCAG 1.4.13). An entry with
// a detail always has something to show, so its tooltip opens whether the
// text fits or not (MB.164). Moved here from IngredientForm (MB.133) so that
// every list draws the same entry (claude-docs/components/combobox.md, "An
// entry").

export function ComboboxEntry({
  value,
  errorId,
  detail,
  onRemove,
}: ComboboxEntryProps): ReactElement {
  const text = useRef<HTMLSpanElement | null>(null);
  const detailId = useId();
  const { open, show, hide, hideSoon } = useTip(() => {
    const element = text.current;
    return Boolean(detail) || (element !== null && element.scrollWidth > element.clientWidth);
  });

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
