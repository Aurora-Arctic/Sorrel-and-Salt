'use client';

import { CSS } from '@dnd-kit/utilities';
import { type ReactElement, useId, useRef } from 'react';
import { GripIcon } from './icons';
import { useTip } from './tip';
import type { ComboboxEntryProps, EntryHandleProps } from './types';

// An entry a list holds, inside the control: its text, and the x that takes
// it out. A text too long for the control is cut off with an ellipsis, and
// shown whole in a tooltip while the entry is hovered or its x has focus —
// only when it is cut off, and closed by Escape (WCAG 1.4.13). An entry with
// a detail always has something to show, so its tooltip opens whether the
// text fits or not (MB.164). Moved here from IngredientForm (MB.133) so that
// every list draws the same entry (claude-docs/components/combobox.md, "An
// entry"). In a sortable list the text is the handle the chip moves by, a
// grip ahead of it (MB.170, "A sortable list").

/**
 * A sortable entry's handle: a real button, so it is in the tab order with
 * its focus ring, holding the grip and the text. dnd-kit's attributes give it
 * a button's role, which it has already.
 */
function EntryHandle({
  value,
  sortable,
  describedBy,
  onFocus,
  onBlur,
  children,
}: EntryHandleProps): ReactElement {
  const { setActivatorNodeRef, listeners, attributes } = sortable;
  const { role: _role, 'aria-describedby': instructions, ...rest } = attributes;
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="combobox__entry-handle"
      {...rest}
      {...listeners}
      aria-label={`Move ${value}`}
      aria-describedby={[describedBy, instructions].filter(Boolean).join(' ')}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <GripIcon />
      {children}
    </button>
  );
}

export function ComboboxEntry({
  value,
  errorId,
  detail,
  onRemove,
  sortable,
}: ComboboxEntryProps): ReactElement {
  const text = useRef<HTMLSpanElement | null>(null);
  const detailId = useId();
  const { open, show, hide, hideSoon } = useTip(() => {
    const element = text.current;
    return Boolean(detail) || (element !== null && element.scrollWidth > element.clientWidth);
  });

  const textSpan = (
    <span ref={text} className="combobox__entry-text">
      {value}
    </span>
  );
  // What the x reads after its name, and the handle before how it moves.
  const describedBy = [errorId, detail && detailId].filter(Boolean).join(' ') || undefined;

  return (
    <li
      ref={sortable?.setNodeRef}
      className={['combobox__entry', errorId && 'is-invalid', sortable?.isDragging && 'is-dragging']
        .filter(Boolean)
        .join(' ')}
      // Where a move has carried the chip so far, translated only: a chip
      // keeps its own size wherever it goes.
      style={
        sortable && {
          transform: CSS.Translate.toString(sortable.transform),
          transition: sortable.transition,
        }
      }
    >
      {/* Hover on a wrapper holding the tooltip as well as the text, so the
          pointer can move onto the tooltip without closing it. */}
      <span className="combobox__entry-label" onMouseEnter={show} onMouseLeave={hideSoon}>
        {sortable ? (
          // Named as the x is, for its entry, and read as the x is.
          <EntryHandle
            value={value}
            sortable={sortable}
            describedBy={describedBy}
            onFocus={show}
            onBlur={hide}
          >
            {textSpan}
          </EntryHandle>
        ) : (
          textSpan
        )}
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
        aria-describedby={describedBy}
        onFocus={show}
        onBlur={hide}
        onClick={onRemove}
      >
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}
