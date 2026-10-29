import type { ReactElement, ReactNode } from 'react';
import { SwitchField } from '../Field';
import TipMark from '../EntryMarks/tip-mark';
import { reviewDay } from './review-date';
import './review-mark.scss';

// The compendium entry's review row (M14.8): the entry's standing as its badge at the start, the day in the badge's tip (EntryMarks leaves its own review badge out wherever this row is shown), the Reviewed
// switch at the end. The Quick Look's head, the entry page's head and the edit and add modals all
// draw this one row, so they match. It saves nothing itself: the caller owns the switch (ReviewMark
// saves on flip, IngredientForm carries it with Save). The words show the SAVED state (`standing`),
// never the switch's unsaved value, and the day only when the page knows it: an add has none.

export interface ReviewRowProps {
  /** Whether a curator has marked the entry, as saved. */
  standing: boolean;
  /** When, as an ISO moment, if the page knows it. */
  reviewedAt?: string | null;
  /** The switch's own value, which may be ahead of `standing`. */
  checked: boolean;
  onChange: (next: boolean) => void;
  /** A change is in flight: the switch is `aria-busy` and a spinner takes the thumb's place. */
  busy?: boolean;
  /** Drawn under the row, such as a refusal. */
  children?: ReactNode;
}

export default function ReviewRow({
  standing,
  reviewedAt = null,
  checked,
  onChange,
  busy = false,
  children,
}: ReviewRowProps): ReactElement {
  return (
    <div className="review-row">
      <div className="review-row__line">
        <span className="review-row__standing">
          {!standing ? (
            <output className="badge badge--attention">Needs Review</output>
          ) : reviewedAt !== null ? (
            // The day is the badge's tip, never drawn beside it (the owner's call, 2026-10-29).
            <TipMark
              label="Reviewed By Curator"
              palette="local"
              tip={`Reviewed ${reviewDay(reviewedAt)}`}
            />
          ) : (
            <output className="badge badge--local">Reviewed By Curator</output>
          )}
        </span>
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
      </div>
      {children}
    </div>
  );
}
