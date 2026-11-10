'use client';

import { type ReactElement, useId } from 'react';
import DateField from '../DateField';
import { today } from '../DateField/day';
import { MS_PER_DAY } from '../../lib/duration';
import { PAUSE_TEXT_MAX_LENGTH } from '../../lib/pause-message';
import { FieldShell, PlainTextField, fieldDescription } from '../Field';
import { LocalDay } from '../SupportRequests/day-range';
import type { AccessPauseEntry, PauseFieldsProps, PauseSpan } from './types';
import '../SupportRequests/timeout-panel.scss';

// The pieces a pause on access is drawn with, shared by the keeper's pause on the site (`access-pause-panel.tsx`) and an
// owner's pause on one coven (`MemberList/pause-control.tsx`), so the two ask and list alike
// (claude-docs/components/user-detail.md, "Contracts").

/** The words a pause on access is drawn with; a time-out overrides them. */
export const PAUSE_WORDS = {
  badge: 'Paused',
  pauseLabel: 'Pause Access',
  pauseConfirm: 'Pause',
  pauseTitle: (name: string) => `Pause Access for ${name}?`,
  pauseBusy: 'Pausing',
  liftLabel: 'Lift Pause',
  liftConfirm: 'Lift',
  liftTitle: 'Lift the Pause?',
  earlierTitle: 'Earlier Pauses',
} as const;

export const SPANS: readonly { value: PauseSpan; label: string }[] = [
  { value: 'day', label: '1 Day' },
  { value: 'week', label: '1 Week' },
  { value: 'month', label: '1 Month' },
  { value: 'date', label: 'Until a Date' },
  { value: 'none', label: 'No End Date' },
];

const MESSAGE_HINT = 'Emailed to them.';

/** Null for no end date; undefined while no valid end can be read from the picked day. */
export function endOf(span: PauseSpan, day: string, now: Date): Date | null | undefined {
  if (span === 'none') return null;
  if (span === 'day') return new Date(now.getTime() + MS_PER_DAY);
  if (span === 'week') return new Date(now.getTime() + 7 * MS_PER_DAY);
  if (span === 'month') {
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    return end;
  }
  if (!day) return undefined;
  const end = new Date(`${day}T23:59:59.999`);
  return Number.isNaN(end.getTime()) ? undefined : end;
}

export const endReady = (end: Date | null | undefined): boolean =>
  end === null || (end?.getTime() ?? 0) > Date.now();

export const pauseReady = (span: PauseSpan, day: string): boolean =>
  endReady(endOf(span, day, new Date()));

export const stands = (pause: AccessPauseEntry, now: number): boolean =>
  pause.liftedAt === null && (pause.until === null || pause.until.getTime() > now);

export const PauseFields = ({
  span,
  onSpan,
  day,
  onDay,
  note,
  onNote,
  noteHint,
  notePlaceholder,
  noteRequired = false,
  message,
  onMessage,
  messageLabel,
  messagePlaceholder,
}: PauseFieldsProps): ReactElement => {
  const spanId = useId();
  const dayId = useId();
  const { aria: spanAria, ...spanField } = fieldDescription({ id: spanId });
  const { aria: dayAria, ...dayField } = fieldDescription({ id: dayId });
  return (
    <>
      <FieldShell label="For" {...spanField}>
        <select
          id={spanField.controlId}
          className="select"
          {...spanAria}
          value={span}
          onChange={(event) => onSpan(event.target.value as PauseSpan)}
        >
          {SPANS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldShell>
      {span === 'date' && (
        <FieldShell label="Until" {...dayField}>
          <DateField
            id={dayField.controlId}
            labelledBy={dayField.labelId}
            value={day}
            min={today()}
            onChange={onDay}
            {...dayAria}
          />
        </FieldShell>
      )}
      <PlainTextField
        name="note"
        label="Note"
        hint={noteHint}
        required={noteRequired}
        autoComplete="off"
        placeholder={notePlaceholder}
        limit={PAUSE_TEXT_MAX_LENGTH}
        value={note}
        onChange={onNote}
      />
      <PlainTextField
        name="message"
        label={messageLabel}
        hint={MESSAGE_HINT}
        required={noteRequired}
        autoComplete="off"
        placeholder={messagePlaceholder}
        limit={PAUSE_TEXT_MAX_LENGTH}
        value={message}
        onChange={onMessage}
      />
    </>
  );
};

/**
 * Earlier pauses, each as when it was set, its end, who set it and, where lifted, who lifted it and when. A support
 * time-out has the same shape, so its panel lists its earlier ones here under its own `title`.
 */
export const Ledger = ({
  pauses,
  title = 'Earlier Pauses',
}: {
  pauses: readonly AccessPauseEntry[];
  title?: string;
}): ReactElement => (
  <div className="timeout-panel__ledger">
    <h4 className="timeout-panel__ledger-title">{title}</h4>
    <ul className="timeout-panel__list" aria-label={title}>
      {pauses.map((pause) => (
        <li key={pause.id}>
          <span className="timeout-panel__ledger-line">
            <span className="timeout-panel__range">
              <LocalDay at={pause.createdAt} />{' '}
              {pause.until ? (
                <>
                  – <LocalDay at={pause.until} />
                </>
              ) : (
                '· No End Date'
              )}
            </span>
            {pause.liftedAt && (
              <span className="badge badge--muted">
                {/* One inline run: the badge is a flex box, which drops a space between two flex items. */}
                <span>
                  Lifted <LocalDay at={pause.liftedAt} year={false} />
                </span>
              </span>
            )}
          </span>
          {pause.note && <span className="timeout-panel__muted">{pause.note}</span>}
          <span className="timeout-panel__muted">
            {pause.setBy ? `Set by ${pause.setBy.name}` : 'Set'}
            {pause.liftedAt && ` · Lifted by ${pause.liftedBy?.name ?? 'a removed account'}`}
          </span>
        </li>
      ))}
    </ul>
  </div>
);
