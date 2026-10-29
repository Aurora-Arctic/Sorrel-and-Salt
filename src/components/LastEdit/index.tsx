import type { ReactElement } from 'react';
import LastEditTip from './last-edit-tip';
import type { LastEditProps } from './types';

// Who last changed a row, and when, kept short: "Edited 3 days ago", with the full "Last
// edited by Fixture A on 1 September 2026" in a tooltip (last-edit-tip.tsx). The server
// renders the short date in UTC ("Edited 1 Sep 2026"); the browser swaps in the relative
// phrase after the page loads. Both sit in one `<time>` whose `datetime` holds the moment.
// An editor the viewer cannot name (`displayNamesOf` answers null) leaves out the "by" half,
// not the line. claude-docs/components/last-edit.md.

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
