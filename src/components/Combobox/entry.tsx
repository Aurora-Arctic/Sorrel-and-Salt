'use client';

import { type ReactElement, useId, useRef } from 'react';
import { chipColors } from '../../lib/chip-colors';
import { LinkIcon } from './icons';
import { useEntrySummary } from './summary';
import GripHandle from '../GripHandle';
import IconTip from '../IconTip';
import TipAnchor, { type TipControls } from '../InfoTip/tip-anchor';
import type { ComboboxEntryProps } from './types';

// An entry a list holds, inside the control: its text and the x that takes it out, with the whole text in a tooltip when cut off or when it has a detail
// (claude-docs/components/combobox.md, "An entry"; "A sortable list"; "A linked entry's summary").

/** dnd-kit's own translate string, written here so the chip does not pull in @dnd-kit/utilities. */
const translateOf = (transform: { x: number; y: number } | null): string | undefined =>
  transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined;

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
  const tip = useRef<TipControls>(null);
  const detailId = useId();
  const qualifierId = useId();
  // A sortable entry's text is its handle, so it opens nothing.
  const summary = sortable ? undefined : summarised;
  const opens = useEntrySummary();
  const canOpen = () => {
    const element = text.current;
    return (
      !opens.open &&
      (Boolean(detail) ||
        Boolean(qualifier) ||
        (element !== null && element.scrollWidth > element.clientWidth))
    );
  };

  // The tooltip runs as wide as its words, past chip and control; `useTip` keeps it on screen.
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
  const describedBy =
    [errorId, qualifier && qualifierId, detail && detailId].filter(Boolean).join(' ') || undefined;

  return (
    <li
      ref={sortable?.setNodeRef}
      className={[
        'combobox__entry',
        colors && 'is-coloured',
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
          transform: translateOf(sortable.transform),
          transition: sortable.transition,
        }),
      }}
    >
      {/* Hover on a wrapper holding the tooltip, so the pointer can move onto it without closing it. */}
      <TipAnchor
        handle={tip}
        className="combobox__entry-label"
        bubbleClass="combobox__entry-tip"
        canOpen={canOpen}
        placement="top-start"
        bubble={
          <>
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
          </>
        }
      >
        {({ show, hide }) => (
          <>
            {iconMark}
            {summary ? (
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
              <GripHandle
                sortable={sortable}
                name={value}
                className="combobox__entry-handle"
                describedBy={describedBy}
                onFocus={show}
                onBlur={hide}
              >
                {textSpan}
              </GripHandle>
            ) : (
              textSpan
            )}
            {countMark}
          </>
        )}
      </TipAnchor>
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
        onFocus={() => tip.current?.show()}
        onBlur={() => tip.current?.hide()}
        onClick={onRemove}
      >
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}
