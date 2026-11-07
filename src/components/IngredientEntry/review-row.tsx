import type { ReactElement, ReactNode } from 'react';
import { SwitchField } from '../Field';
import TipMark from '../EntryMarks/tip-mark';
import { reviewDay } from './review-date';
import './review-mark.scss';

// The compendium entry's review row: the standing as a badge, the Reviewed switch at the end. It saves nothing: the
// caller owns the switch. The words show the SAVED state (`standing`), never the switch's unsaved value, and the day
// only when known: an add has none.

export interface ReviewRowProps {
  standing: boolean;
  reviewedAt?: string | null;
  checked: boolean;
  onChange: (next: boolean) => void;
  busy?: boolean;
  alongside?: ReactNode;
  children?: ReactNode;
}

export default function ReviewRow({
  standing,
  reviewedAt = null,
  checked,
  onChange,
  busy = false,
  alongside,
  children,
}: ReviewRowProps): ReactElement {
  return (
    <div className="review-row">
      <div className="review-row__line">
        <span className="review-row__standing">
          {!standing ? (
            <output className="badge badge--attention">Needs Review</output>
          ) : reviewedAt !== null ? (
            // The day is the badge's tip, never drawn beside it.
            <TipMark
              label="Reviewed By Curator"
              palette="local"
              tip={`Reviewed ${reviewDay(reviewedAt)}`}
            />
          ) : (
            <output className="badge badge--local">Reviewed By Curator</output>
          )}
        </span>
        <span className="review-row__switches">
          <span className="review-mark">
            <SwitchField
              label="Reviewed"
              name="reviewed"
              value="1"
              checked={checked}
              onChange={onChange}
              busy={busy}
            />
          </span>
          {alongside}
        </span>
      </div>
      {children}
    </div>
  );
}
