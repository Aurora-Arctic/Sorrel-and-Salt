'use client';

import { ClientError } from 'graphql-request';
import { useRouter } from 'next/navigation';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import type { CreationAction, CreationControlProps, CreationStep } from './types';

// The row's Approve or Revoke (M5.8): lets a user with no invitation create a
// coven, or stops them, behind a confirmation naming them. The service is the
// guard; this only puts it where an admin looks. A success re-reads the page,
// whose row then offers the other action.

const GrantWorkspaceCreationDocument = graphql(`
  mutation GrantWorkspaceCreation($userId: ID!) {
    grantWorkspaceCreation(userId: $userId) {
      id
      canCreateWorkspace
    }
  }
`);

const RevokeWorkspaceCreationDocument = graphql(`
  mutation RevokeWorkspaceCreation($userId: ID!) {
    revokeWorkspaceCreation(userId: $userId) {
      id
      canCreateWorkspace
    }
  }
`);

/** Each action's words, its confirm's style and its write. */
const ACTIONS: Record<
  CreationAction,
  {
    label: string;
    accessibleName: (name: string) => string;
    question: (name: string) => string;
    busy: string;
    confirmClass: string;
    send: (userId: string) => Promise<unknown>;
  }
> = {
  approve: {
    label: 'Approve',
    accessibleName: (name) => `Approve ${name}`,
    question: (name) => `Let ${name} create covens?`,
    busy: 'Approving',
    confirmClass: 'btn btn--solid',
    send: (userId) => graphqlRequest(GrantWorkspaceCreationDocument, { userId }),
  },
  revoke: {
    label: 'Revoke',
    accessibleName: (name) => `Revoke approval for ${name}`,
    question: (name) => `Stop ${name} creating covens? Covens they own stay theirs.`,
    busy: 'Revoking',
    confirmClass: 'btn btn--destructive',
    send: (userId) => graphqlRequest(RevokeWorkspaceCreationDocument, { userId }),
  },
};

const GENERIC_ERROR = "That didn't work. Please try again.";

/** The service's own refusal, verbatim, or one generic sentence. */
function messageOf(error: unknown): string {
  if (!(error instanceof ClientError)) return GENERIC_ERROR;
  return error.response.errors?.[0]?.message || GENERIC_ERROR;
}

const CreationControl = ({ userId, name, action }: CreationControlProps): ReactElement => {
  const router = useRouter();
  const copy = ACTIONS[action];
  const [step, setStep] = useState<CreationStep>('idle');
  const [failure, setFailure] = useState<string>();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  // Set by Cancel only, so the first render takes no focus.
  const returning = useRef(false);

  // Focus follows the step: to Confirm when asked, back to the action on Cancel.
  useEffect(() => {
    if (step === 'confirming') confirmRef.current?.focus();
    if (step === 'idle' && returning.current) {
      returning.current = false;
      openRef.current?.focus();
    }
  }, [step]);

  async function confirm() {
    setStep('sending');
    setFailure(undefined);
    try {
      await copy.send(userId);
      // Busy until the re-read replaces this row with one offering the other action.
      router.refresh();
    } catch (error) {
      setStep('idle');
      setFailure(messageOf(error));
    }
  }

  function cancel() {
    returning.current = true;
    setStep('idle');
  }

  if (step === 'idle') {
    return (
      <>
        {/* The visible label opens the accessible name, so a voice command
            saying what it sees still reaches it. */}
        <button
          ref={openRef}
          className="btn"
          type="button"
          aria-label={copy.accessibleName(name)}
          onClick={() => setStep('confirming')}
        >
          {copy.label}
        </button>
        {failure && (
          <p className="notice notice--error" role="alert">
            {failure}
          </p>
        )}
      </>
    );
  }

  const sending = step === 'sending';
  return (
    <div className="user-list__confirm">
      <p>{copy.question(name)}</p>
      <div className="user-list__actions">
        <button
          ref={confirmRef}
          className={copy.confirmClass}
          type="button"
          disabled={sending}
          aria-busy={sending || undefined}
          onClick={() => void confirm()}
        >
          {sending && <span className="spinner" aria-hidden="true" />}
          {sending ? copy.busy : 'Confirm'}
        </button>
        {!sending && (
          <button className="btn btn--quiet" type="button" onClick={cancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default CreationControl;
