'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { type ReactElement, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { useClickFeedback } from '../ClickFeedback';
import Notice from '../Notice';
import ConfirmedAction from './confirmed-action';
import LockedControl from './locked-control';
import type { PauseControlProps } from './types';

// The primary keeper's switch on keeper grants and revokes: a warning while paused and the control
// that flips it. Every keeper sees both; only the primary keeper can use it, others see the reason in
// a tip. Pause asks first; Resume acts at once. The service is the guard
// (claude-docs/components/user-list.md).

const PauseAdminRoleChangesDocument = graphql(`
  mutation PauseAdminRoleChanges {
    pauseAdminRoleChanges
  }
`);

const ResumeAdminRoleChangesDocument = graphql(`
  mutation ResumeAdminRoleChanges {
    resumeAdminRoleChanges
  }
`);

const STATES = {
  paused: {
    state:
      // Short: who may still act is the switch's tip.
      'Keeper changes are paused.',
    label: 'Resume Keeper Changes',
    done: 'Keeper changes are resumed.',
    busy: 'Resuming',
    // Red and full size like Pause, so the control
    // keeps its look as it flips.
    buttonClass: 'btn btn--destructive',
    send: () => graphqlRequest(ResumeAdminRoleChangesDocument),
  },
  open: {
    // No sentence while changes are on: only the button.
    state: undefined,
    label: 'Pause Keeper Changes',
    done: 'Keeper changes are paused.',
    busy: 'Pausing',
    // Big and red: it stops every other keeper.
    buttonClass: 'btn btn--destructive',
    send: () => graphqlRequest(PauseAdminRoleChangesDocument),
  },
} as const;

/** Whom a pause stops, asked before it is sent. */
const PAUSE_QUESTION =
  'Pause keeper changes? Until you resume them, no other keeper can grant or revoke the keeper role, approve or revoke coven creation, or invite a keeper.';

/** Why the control cannot be used, to a keeper who is not the primary one. */
const NOT_PRIMARY = 'Only the primary keeper can pause or resume keeper changes.';

const PauseControl = ({ paused, canToggle }: PauseControlProps): ReactElement => {
  const { refresh } = usePendingNavigation();
  const copy = STATES[paused ? 'paused' : 'open'];
  const [sending, setSending] = useState(false);
  // Resume's refusal, in a callout under it, as a row's is.
  const feedback = useClickFeedback({ name: copy.label });

  async function toggle() {
    if (sending) return;
    setSending(true);
    feedback.report(undefined);
    try {
      await copy.send();
      feedback.announce(copy.done);
      // Busy until the re-read page states the other state.
      refresh();
    } catch (error) {
      setSending(false);
      feedback.report(readGraphqlFailure(error).alert);
    }
  }

  return (
    <div className="user-list__pause">
      {/* The page's statement that changes are paused, as a warning.
          Quiet, a status rather than an alert, as every notice
          of a state here is, so it is found by its role rather than its
          words; the switch is remounted by the refresh after a flip, so it
          arrives with the page and is read in its order rather than
          announced. */}
      {copy.state && (
        <Notice kind="warn" quiet className="user-list__pause-state">
          {copy.state}
        </Notice>
      )}
      {!canToggle ? (
        // In view but unusable, its reason in a tip, as the primary keeper's
        // Revoke is (on): the notice is the page's one sentence.
        <LockedControl label={copy.label} className={copy.buttonClass} reason={NOT_PRIMARY} />
      ) : paused ? (
        <>
          {/* Held by aria-disabled rather than disabled while the change is
              out, so the focus stays on it and a refusal is read with the
              focus where it was, as Stop Impersonating's is. */}
          <BusyButton
            ref={feedback.anchorRef}
            className={copy.buttonClass}
            aria-disabled={sending || undefined}
            busy={sending}
            busyLabel={copy.busy}
            onClick={() => void toggle()}
          >
            {copy.label}
          </BusyButton>
          {/* oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering */}
          {feedback.feedback}
        </>
      ) : (
        // Its refusal is said under it by the confirmation, as a row's is.
        <ConfirmedAction
          label={copy.label}
          accessibleName={copy.label}
          openClass={copy.buttonClass}
          title={copy.label}
          question={PAUSE_QUESTION}
          busy={copy.busy}
          confirmClass={copy.buttonClass}
          announcement={copy.done}
          send={copy.send}
        />
      )}
    </div>
  );
};

export default PauseControl;
