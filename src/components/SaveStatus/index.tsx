'use client';

import { useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { clockTime } from '../LastEdit/relative';
import Notice from '../Notice';
import Spinner from '../Spinner';
import type { SaveStatusProps } from './types';
import './index.scss';

// Where an autosaving form says how its saves go: inline beside the primary action, never a toast.
// Only the conflict notice may go elsewhere (`conflictInto`), as it asks for a decision. Screen
// readers hear only a burst's first save (claude-docs/components/autosave.md).

/** A save more than this long after the last one starts a new burst, and is announced. */
export const BURST_GAP_MS = 60_000;

type Seen = {
  /** The last confirmed save this component has shown, in milliseconds. */
  at: number | null;
  /** A failure or conflict since then: the next save is news. */
  interrupted: boolean;
  /** A failure not yet followed by a save: the alert stays, through a retry. */
  failing: boolean;
  /** What the live region says. */
  announced: string;
};

const SaveStatus = ({
  status,
  savedAt,
  draft = false,
  conflictMessage,
  onRetry,
  onReload,
  onKeepMine,
  conflictInto,
  className,
}: SaveStatusProps): ReactElement => {
  const saved = savedAt ? `${draft ? 'Draft saved' : 'Saved'} ${clockTime(savedAt)}` : '';

  // Adjusted during render rather than in an effect, so the announcement
  // lands in the same commit as the save it reports.
  const [seen, setSeen] = useState<Seen>({
    at: null,
    interrupted: false,
    failing: false,
    announced: '',
  });
  let next = seen;
  if (status === 'failed' && !seen.failing) next = { ...next, interrupted: true, failing: true };
  if (status === 'conflict' && (!seen.interrupted || seen.failing)) {
    next = { ...next, interrupted: true, failing: false };
  }
  if (status === 'idle' && seen.failing) next = { ...next, failing: false };
  if (status === 'saved' && savedAt && savedAt.getTime() !== seen.at) {
    const opens =
      seen.at === null || seen.interrupted || savedAt.getTime() - seen.at > BURST_GAP_MS;
    next = {
      at: savedAt.getTime(),
      interrupted: false,
      failing: false,
      announced: opens ? saved : seen.announced,
    };
  }
  if (next !== seen) setSeen(next);

  const retrying = next.failing && status === 'saving';
  const classes = className ? `save-status ${className}` : 'save-status';
  const conflict = status === 'conflict' && (
    <Notice kind="warn" block className="save-status__conflict">
      <span>{conflictMessage}</span>
      <span className="save-status__actions">
        {/* One primary: Reload Latest, the safe choice; Keep My Version sits back, quiet. */}
        <button type="button" className="btn btn--small btn--solid" onClick={onReload}>
          Reload Latest
        </button>
        <button type="button" className="btn btn--small btn--quiet" onClick={onKeepMine}>
          Keep My Version
        </button>
      </span>
    </Notice>
  );

  return (
    <div className={classes}>
      {conflict && conflictInto && createPortal(conflict, conflictInto)}
      {conflict && !conflictInto ? (
        conflict
      ) : next.failing ? (
        <Notice kind="warn" block className="save-status__failed">
          <span>Couldn&rsquo;t save.</span>
          <button
            type="button"
            className="btn btn--small"
            onClick={onRetry}
            disabled={retrying}
            aria-busy={retrying || undefined}
          >
            {retrying ? <Spinner /> : null}
            Retry
          </button>
        </Notice>
      ) : (
        // Hidden from assistive technology: the live region below says it, once per burst.
        <span className="save-status__text" aria-hidden="true">
          {status === 'saving' ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            saved
          )}
        </span>
      )}
      <output className="save-status__announced">{next.announced}</output>
    </div>
  );
};

export default SaveStatus;
export { default as RecoveryNotice } from './recovery-notice';
