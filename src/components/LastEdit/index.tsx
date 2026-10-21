import type { ReactElement } from 'react';
import RelativeTime from './relative-time';
import type { LastEditProps } from './types';

// Who last changed a row, and when (M6.18, story 13). The date is the server's, in UTC
// so the server's zone cannot move it; the relative phrase ("3 days ago") is the
// browser's, drawn beside it after the page loads (relative-time.tsx), never in a
// tooltip. Both sit in one `<time>` whose `datetime` holds the moment. An editor the
// viewer cannot name (`displayNamesOf` answers null) leaves out the "by" half, not the
// time: an edit with no name still says it happened. claude-docs/components/last-edit.md.

const day = (at: Date) =>
  at.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

export default function LastEdit({ by, at }: LastEditProps): ReactElement | null {
  const moment = new Date(at);
  if (Number.isNaN(moment.getTime())) return null;
  return (
    <p className="meta last-edit">
      Last edited{by && <> by {by}</>} on{' '}
      <time dateTime={moment.toISOString()}>
        {day(moment)}
        <RelativeTime at={moment.toISOString()} />
      </time>
    </p>
  );
}

export type { LastEditProps } from './types';
