'use client';

import { CSS } from '@dnd-kit/utilities';
import { type ReactElement, useId, useRef } from 'react';
import { chipColors } from '../../lib/chip-colors';
import { GripIcon, LinkIcon } from './icons';
import { useEntrySummary } from './summary';
import IconTip from '../IconTip';
import { useTip } from '../InfoTip/use-tip';
import type { ComboboxEntryProps, EntryHandleProps } from './types';

// An entry a list holds, inside the control: its text and the x that takes it out, with the whole text in a tooltip when cut off or when it has a detail
// (claude-docs/components/combobox.md, "An entry"; "A sortable list"; "A linked entry's summary").

/** A sortable entry's handle: a real button, so it is in the tab order with its focus ring, holding the grip and the text. */
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
  qualifier,
  colors,
  summary: summarised,
  note,
  icon,
  count,
  loading,
  outlined,
  removeNoun,
  onRemove,
  action,
  sortable,
}: ComboboxEntryProps): ReactElement {
  const text = useRef<HTMLSpanElement | null>(null);
  const detailId = useId();
  const qualifierId = useId();
  // A sortable entry's text is its handle, so it opens nothing.
  const summary = sortable ? undefined : summarised;
  const opens = useEntrySummary();
  // Asked as the tooltip opens: an open summary keeps it shut, saying more.
  const { open, show, showSoon, hide, hideSoon, anchor, bubble, bubbleStyle } = useTip(() => {
    const element = text.current;
    return (
      !opens.open &&
      (Boolean(detail) ||
        Boolean(qualifier) ||
        (element !== null && element.scrollWidth > element.clientWidth))
    );
  }, 'top-start');

  // The tooltip runs as wide as its words, past the chip and the control; only being cut off is wrong. `useTip` keeps it on screen.
  const textSpan = (
    <span ref={text} className="combobox__entry-text">
      {value}
    </span>
  );
  // After the text, outside the span that is cut off, so a long name loses its tail and never its count; the space is a text node outside the span so the chip reads "Water 7".
  const countMark = loading ? (
    <span className="combobox__entry-count is-pending" aria-hidden="true" />
  ) : count !== undefined ? (
    <>
      {' '}
      <span className="combobox__entry-count">{count}</span>
    </>
  ) : null;
  const iconMark = icon ? (
    <span className="combobox__entry-icon" aria-hidden="true">
      {icon}
    </span>
  ) : null;
  // What the x reads after its name, and the handle before how it moves: the error, the qualifier, then the detail.
  const describedBy =
    [errorId, qualifier && qualifierId, detail && detailId].filter(Boolean).join(' ') || undefined;

  return (
    <li
      ref={sortable?.setNodeRef}
      className={[
        'combobox__entry',
        colors && 'is-coloured',
        // A group's fill is its own: outlined chips are the neutral ones.
        outlined && !colors && 'is-outlined',
        errorId && 'is-invalid',
        sortable?.isDragging && 'is-dragging',
      ]
        .filter(Boolean)
        .join(' ')}
      // Its group's colour pair, read by the stylesheet, and where a move has carried the chip, translated only so a chip keeps its own size.
      style={{
        ...(colors && chipColors(colors)),
        ...(sortable && {
          transform: CSS.Translate.toString(sortable.transform),
          transition: sortable.transition,
        }),
      }}
    >
      {/* Hover on a wrapper holding the tooltip, so the pointer can move onto it without closing it. */}
      <span
        ref={anchor}
        className="combobox__entry-label"
        onMouseEnter={showSoon}
        onMouseLeave={hideSoon}
      >
        {iconMark}
        {summary ? (
          // Named by its text, as the x is, and read as the x is; it says
          // it opens a dialog, and whether that is open.
          <button
            type="button"
            className="combobox__entry-open"
            {...opens.opener}
            aria-describedby={describedBy}
            onClick={() => {
              hide();
              opens.opener.onClick();
            }}
            onFocus={show}
            onBlur={(event) => {
              hide();
              opens.opener.onBlur(event);
            }}
          >
            <LinkIcon />
            {textSpan}
          </button>
        ) : sortable ? (
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
        {countMark}
        {/* In the page while closed, faded out and aria-hidden, so it fades both ways as InfoTip's does. */}
        <span
          ref={bubble}
          role="tooltip"
          style={bubbleStyle}
          className={open ? 'combobox__entry-tip is-open' : 'combobox__entry-tip'}
          aria-hidden={!open}
        >
          {value}
          {/* After the text, in brackets outside the span, so the x's description reads the name alone. */}
          {qualifier && (
            <>
              {' ('}
              <span id={qualifierId}>{qualifier}</span>
              {')'}
            </>
          )}
          {/* Referenced by the x below, so read although the tooltip is aria-hidden while closed. */}
          {detail && (
            <span id={detailId} className="combobox__entry-detail">
              {detail}
            </span>
          )}
        </span>
      </span>
      {note && <span className="visually-hidden"> ({note})</span>}
      {/* In the chip, after its button, so the Tab order runs from the text into the panel and on to the x. */}
      {summary && opens.open && (
        // A non-modal dialog, opened by its attribute rather than `show()`,
        // so the browser gives it no Escape of its own: the hook's is the one.
        <dialog
          open
          aria-label={summary.label}
          className="combobox__entry-summary"
          {...opens.panel}
        >
          {summary.content()}
        </dialog>
      )}
      {/* An action on the entry, ahead of the x, in the tab order and named
          for its entry as the x is; its tip is decoration (IconTip). */}
      {action && (
        <IconTip tip={action.tip} placement="above">
          <button
            type="button"
            className="combobox__entry-action"
            aria-label={action.label}
            aria-describedby={describedBy}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.icon}
          </button>
        </IconTip>
      )}
      {/* Named for its entry: a column of bare "Remove"s is no help to a
          screen reader. In the tab order, a 24px target, and described by
          the list's error when the error names this entry, then by the
          entry's detail. */}
      <button
        type="button"
        className="combobox__entry-remove"
        aria-label={removeNoun ? `Remove ${removeNoun}: ${value}` : `Remove ${value}`}
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
