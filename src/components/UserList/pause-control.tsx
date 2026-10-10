'use client';

import { ClientError } from 'graphql-request';
import { useRouter } from 'next/navigation';
import { type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import type { PauseControlProps } from './types';

// The primary admin's switch on admin grants and revokes (MB.63), above the
// list: the state in words, and the control that flips it. Every admin sees
// both; only the primary admin can use the control, whose reason the others
// are told beside it, and again when they try. The service is the guard
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
      'Admin changes are paused: only the primary admin can make someone an admin or stop them being one.',
    label: 'Resume Admin Changes',
    busy: 'Resuming',
    send: () => graphqlRequest(ResumeAdminRoleChangesDocument),
  },
  open: {
    state: 'Admin changes are on: any admin can make someone an admin or stop them being one.',
    label: 'Pause Admin Changes',
    busy: 'Pausing',
    send: () => graphqlRequest(PauseAdminRoleChangesDocument),
  },
} as const;

/** Why the control cannot be used, to an admin who is not the primary one. */
const NOT_PRIMARY = 'Only the primary admin can pause or resume admin changes.';

const GENERIC_ERROR = "That didn't work. Please try again.";

const PauseControl = ({ paused, canToggle }: PauseControlProps): ReactElement => {
  const router = useRouter();
  const reasonId = useId();
  const copy = STATES[paused ? 'paused' : 'open'];
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string>();
  // Each try by an admin who cannot mounts the reason afresh, as an alert.
  const [attempts, setAttempts] = useState(0);

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
      <p className="user-list__pause-state">{copy.state}</p>
      {canToggle ? (
        <button
          className="btn btn--small btn--quiet"
          type="button"
          disabled={sending}
          aria-busy={sending || undefined}
          onClick={() => void toggle()}
        >
          {sending && <span className="spinner" aria-hidden="true" />}
          {sending ? copy.busy : copy.label}
        </button>
      ) : (
        <>
          {/* `aria-disabled`, not `disabled`: it keeps its place in the tab
              order, and a click says why rather than doing nothing. */}
          <button
            className="btn btn--small btn--quiet"
            type="button"
            aria-disabled="true"
            aria-describedby={reasonId}
            onClick={() => setAttempts((count) => count + 1)}
          >
            {copy.label}
          </button>
          <p
            key={attempts}
            id={reasonId}
            className="user-list__reason"
            role={attempts ? 'alert' : undefined}
          >
            {NOT_PRIMARY}
          </p>
        </>
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
