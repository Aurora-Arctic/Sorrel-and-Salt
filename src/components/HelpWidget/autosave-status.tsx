'use client';

import { useId, type ReactElement } from 'react';
import { RETRY_DELAYS_MS, type AutosaveStatus } from '@/lib/autosave';
import { useHydrated } from '@/lib/hydrated';
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

function seconds(delays: readonly number[]): string {
  const words = delays.map((delay) => String(delay / 1000));
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]} seconds`;
}

const nothing = (): void => {};

const AutosaveStatusWidget = (): ReactElement => {
  const id = useId();
  // Null until hydrated, so the clock time is the reader's and the server's render matches the browser's.
  const now = useHydrated() ? new Date() : null;
  return (
    <figure className="figure help-widget">
      <dl className="help-widget__states">
        {(Object.keys(STATUS_LABELS) as AutosaveStatus[]).map((status) => (
          <div key={status} className="help-widget__state">
            <dt id={`${id}-${status}`}>{STATUS_LABELS[status]}</dt>
            <dd aria-labelledby={`${id}-${status}`}>
              <SaveStatus
                status={status}
                savedAt={status === 'idle' ? null : now}
                conflictMessage="Someone else saved this spell since you opened it."
                onRetry={nothing}
                onReload={nothing}
                onKeepMine={nothing}
              />
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
