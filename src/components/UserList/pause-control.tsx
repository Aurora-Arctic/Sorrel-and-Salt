'use client';

import { ClientError } from 'graphql-request';
import { useRouter } from 'next/navigation';
import { type ReactElement, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import LockedControl from './locked-control';
import type { PauseControlProps } from './types';

// The primary admin's switch on admin grants and revokes (MB.63), beside the
// page's heading: a warning while changes are paused, and the control that
// flips it. Every admin sees both; only the primary admin can use the
// control, whose reason the others see in a tip, and again when they try. The
// service is the guard
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

/** Why the control cannot be used, to an admin who is not the primary one. */
const NOT_PRIMARY = 'Only the primary admin can pause or resume admin changes.';

const GENERIC_ERROR = "That didn't work. Please try again.";

const PauseControl = ({ paused, canToggle }: PauseControlProps): ReactElement => {
  const router = useRouter();
  const copy = STATES[paused ? 'paused' : 'open'];
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string>();

  async function toggle() {
    setSending(true);
    setFailure(undefined);
    try {
      await copy.send();
      // Busy until the re-read page states the other state.
      router.refresh();
    } catch (error) {
      setSending(false);
      setFailure(
        (error instanceof ClientError && error.response.errors?.[0]?.message) || GENERIC_ERROR,
      );
    }
  }

  return (
    <div className="user-list__pause">
      {/* The page's statement that changes are paused, as a warning, on the
          owner's call. An `<output>`, a status by its tag as every notice of
          a state here is, so it is found by its role rather than its words;
          the switch is remounted by the refresh after a flip, so it arrives
          with the page and is read in its order rather than announced. */}
      {copy.state && (
        <output className="notice notice--warn user-list__pause-state">{copy.state}</output>
      )}
      {canToggle ? (
        <button
          className={copy.buttonClass}
          type="button"
          disabled={sending}
          aria-busy={sending || undefined}
          onClick={() => void toggle()}
        >
          {sending && <span className="spinner" aria-hidden="true" />}
          {sending ? copy.busy : copy.label}
        </button>
      ) : (
        // In view but unusable, its reason in a tip, as the primary admin's
        // Revoke is (on the owner's call): the notice is the page's one sentence.
        <LockedControl label={copy.label} className={copy.buttonClass} reason={NOT_PRIMARY} />
      )}
      {failure && (
        <p className="notice notice--error" role="alert">
          {failure}
        </p>
      )}
    </div>
  );
};

export default PauseControl;
