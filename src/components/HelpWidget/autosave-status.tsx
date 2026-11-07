'use client';

import { useId, type ReactElement } from 'react';
import { RETRY_DELAYS_MS, type AutosaveStatus } from '@/lib/autosave';
import SaveStatus from '../SaveStatus';

// The spell builder's real save line in each state, beside the retry delays the autosave hook waits on
// (claude-docs/components/help-pages.md, "Widgets"). The buttons are the line's own and do nothing here.

/** Each state's name, in the order a save moves through them. */
export const STATUS_LABELS: Readonly<Record<AutosaveStatus, string>> = {
  idle: 'Nothing to Save',
  pending: 'A Change Is Waiting',
  saving: 'Saving',
  saved: 'Saved',
  failed: 'Could Not Save',
  conflict: 'Changed Elsewhere',
};

/** What each state means for the reader, shown beneath its line. */
const EXPLAINED: Readonly<Record<AutosaveStatus, string>> = {
  idle: 'Nothing has changed since the spell opened, so the line is empty.',
  pending:
    'You have changed something and the save is about to start. The line still shows the last save until it does.',
  saving: 'The change is on its way to the server.',
  saved: 'The server has every change, as of the time shown.',
  failed:
    'The save did not go through. Your changes are still on the page; press Retry to send them again.',
  conflict:
    'Someone else saved the spell after you opened it. Reload Latest shows their version; Keep My Version saves yours over it.',
};

// Built from local parts, not one instant, so the server and the browser each read it as 2:02 pm in their own zone.
const SAVED_AT = new Date(2026, 0, 1, 14, 2);

function seconds(delays: readonly number[]): string {
  const words = delays.map((delay) => String(delay / 1000));
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]} seconds`;
}

const nothing = (): void => {};

const AutosaveStatusWidget = (): ReactElement => {
  const id = useId();
  return (
    <figure className="figure help-widget">
      <dl className="help-widget__states">
        {(Object.keys(STATUS_LABELS) as AutosaveStatus[]).map((status) => (
          <div key={status} className="help-widget__state">
            <dt id={`${id}-${status}`}>{STATUS_LABELS[status]}</dt>
            <dd aria-labelledby={`${id}-${status}`}>
              <SaveStatus
                status={status}
                savedAt={status === 'idle' ? null : SAVED_AT}
                conflictMessage="Someone else saved this spell since you opened it."
                onRetry={nothing}
                onReload={nothing}
                onKeepMine={nothing}
                example
              />
              <p className="help-widget__explained">{EXPLAINED[status]}</p>
            </dd>
          </div>
        ))}
      </dl>
      <p role="note" aria-label="Retries" className="help-widget__note">
        When a save cannot reach the server, it tries again after {seconds(RETRY_DELAYS_MS)}, then
        shows Could Not Save with Retry. A save the server refuses stops at once.
      </p>
      <figcaption>
        The save line beside a spell&rsquo;s Save button, in each of its states.
      </figcaption>
    </figure>
  );
};

export default AutosaveStatusWidget;
