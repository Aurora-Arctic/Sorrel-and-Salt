'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import Notice from '../Notice';
import ConfirmedAction from './confirmed-action';
import LockedControl from './locked-control';
import type { PauseControlProps } from './types';

// The primary admin's switch on admin grants and revokes (MB.63), beside the
// page's heading: a warning while changes are paused, and the control that
// flips it. Every admin sees both; only the primary admin can use the
// control, whose reason the others see in a tip, and again when they try.
// Pause asks first, saying whom it stops (MB.115, on the owner's call, which
// reverses MB.63's acting at once); Resume gives back, so it acts at once.
// The service is the guard (claude-docs/components/user-list.md).

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
      // Short, on the owner's call: who may still act is the switch's tip.
      'Admin changes are paused.',
    label: 'Resume Admin Changes',
    busy: 'Resuming',
    // Red and full size like Pause, on the owner's call, so the control
    // keeps its look as it flips.
    buttonClass: 'btn btn--destructive',
    send: () => graphqlRequest(ResumeAdminRoleChangesDocument),
  },
  open: {
    // No sentence while changes are on, on the owner's call: only the button.
    state: undefined,
    label: 'Pause Admin Changes',
    busy: 'Pausing',
    // Big and red, on the owner's call: it stops every other admin.
    buttonClass: 'btn btn--destructive',
    send: () => graphqlRequest(PauseAdminRoleChangesDocument),
  },
} as const;

/** Whom a pause stops, asked before it is sent. */
const PAUSE_QUESTION =
  'Pause admin changes? Until you resume them, no other admin can grant or revoke admin, approve or revoke coven creation, or invite an admin.';

/** Why the control cannot be used, to an admin who is not the primary one. */
const NOT_PRIMARY = 'Only the primary admin can pause or resume admin changes.';

const PauseControl = ({ paused, canToggle }: PauseControlProps): ReactElement => {
  const { refresh } = usePendingNavigation();
  const copy = STATES[paused ? 'paused' : 'open'];
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string>();

  async function toggle() {
    setSending(true);
    setFailure(undefined);
    try {
      await copy.send();
      // Busy until the re-read page states the other state.
      refresh();
    } catch (error) {
      setSending(false);
      setFailure(readGraphqlFailure(error).alert);
    }
  }

  return (
    <div className="user-list__pause">
      {/* The page's statement that changes are paused, as a warning, on the
          owner's call. Quiet, a status rather than an alert, as every notice
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
        // In view but unusable, its reason in a tip, as the primary admin's
        // Revoke is (on the owner's call): the notice is the page's one sentence.
        <LockedControl label={copy.label} className={copy.buttonClass} reason={NOT_PRIMARY} />
      ) : paused ? (
        <BusyButton
          className={copy.buttonClass}
          disabled={sending}
          busy={sending}
          busyLabel={copy.busy}
          onClick={() => void toggle()}
        >
          {copy.label}
        </BusyButton>
      ) : (
        // Its refusal is said beside it by the confirmation, as a row's is.
        <ConfirmedAction
          label={copy.label}
          accessibleName={copy.label}
          openClass={copy.buttonClass}
          title={copy.label}
          question={PAUSE_QUESTION}
          busy={copy.busy}
          confirmClass={copy.buttonClass}
          send={copy.send}
        />
      )}
      {failure && <Notice kind="error">{failure}</Notice>}
    </div>
  );
};

export default PauseControl;
