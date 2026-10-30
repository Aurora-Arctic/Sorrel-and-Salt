import type { ReactElement } from 'react';
import LastEditTip from './last-edit-tip';
import type { LastEditProps } from './types';

// Who last changed a row, kept short ("Edited 3 days ago"), with the full sentence in a tooltip.
// The server renders the date in UTC and the browser swaps in the relative phrase, both in one
// `<time>`; an unnameable editor drops the "by" half (claude-docs/components/last-edit.md).

const day = (at: Date, month: 'short' | 'long') =>
  at.toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' });

export default function LastEdit({ by, at }: LastEditProps): ReactElement | null {
  const moment = new Date(at);
  if (Number.isNaN(moment.getTime())) return null;
  return (
    <p className="meta last-edit">
      <LastEditTip
        moment={moment.toISOString()}
        short={day(moment, 'short')}
        sentence={`Last edited${by ? ` by ${by}` : ''} on ${day(moment, 'long')}`}
      />
    </p>
  );
}

export type { LastEditProps } from './types';
