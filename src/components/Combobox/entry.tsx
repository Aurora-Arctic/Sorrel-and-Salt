'use client';

import { CSS } from '@dnd-kit/utilities';
import { type ReactElement, useId, useLayoutEffect, useRef } from 'react';
import { chipColors } from '../../lib/chip-colors';
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

/** How close to the screen's edge a tooltip may come: the page's gutter. */
const TIP_SCREEN_MARGIN_PX = 16;

export function ComboboxEntry({
  value,
  errorId,
  detail,
  qualifier,
  colors,
  onRemove,
  sortable,
}: ComboboxEntryProps): ReactElement {
  const text = useRef<HTMLSpanElement | null>(null);
  const detailId = useId();
  const qualifierId = useId();
  const { open, show, hide, hideSoon } = useTip(() => {
    const element = text.current;
    return (
      Boolean(detail) ||
      Boolean(qualifier) ||
      (element !== null && element.scrollWidth > element.clientWidth)
    );
  });
  // The tooltip runs as wide as its words, past the chip and the control, the
  // owner's call: only being cut off is wrong. Shifted left as it opens by
  // however far it would run off the screen, as far as its own left edge
  // allows, in a layout effect so the move lands in the commit that shows it.
  const tip = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    const bubble = tip.current;
    if (!open || !bubble) return;
    bubble.style.setProperty('--entry-tip-shift', '0px');
    const { left, right } = bubble.getBoundingClientRect();
    const over = right - (document.documentElement.clientWidth - TIP_SCREEN_MARGIN_PX);
    const shift = Math.min(Math.max(over, 0), Math.max(left - TIP_SCREEN_MARGIN_PX, 0));
    bubble.style.setProperty('--entry-tip-shift', `${-shift}px`);
  }, [open]);

  const textSpan = (
    <span ref={text} className="combobox__entry-text">
      {value}
    </span>
  );
  // What the x reads after its name, and the handle before how it moves: the
  // error, the qualifier, then the detail.
  const describedBy =
    [errorId, qualifier && qualifierId, detail && detailId].filter(Boolean).join(' ') || undefined;

  return (
    <li
      ref={sortable?.setNodeRef}
      className={[
        'combobox__entry',
        colors && 'is-coloured',
        errorId && 'is-invalid',
        sortable?.isDragging && 'is-dragging',
      ]
        .filter(Boolean)
        .join(' ')}
      // Its group's colour pair, read by the stylesheet (MB.126), and where a
      // move has carried the chip so far, translated only: a chip keeps its
      // own size wherever it goes.
      style={{
        ...(colors && chipColors(colors)),
        ...(sortable && {
          transform: CSS.Translate.toString(sortable.transform),
          transition: sortable.transition,
        }),
      }}
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
          ref={tip}
          role="tooltip"
          className={open ? 'combobox__entry-tip is-open' : 'combobox__entry-tip'}
          aria-hidden={!open}
        >
          {value}
          {/* After the text on its line, in brackets, as a picked deity's
              pill reads its tradition (MB.126): the brackets outside the
              span, so the x's description reads the name alone. */}
          {qualifier && (
            <>
              {' ('}
              <span id={qualifierId}>{qualifier}</span>
              {')'}
            </>
          )}
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
