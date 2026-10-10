'use client';

import { ClientError } from 'graphql-request';
import { useRouter } from 'next/navigation';
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import Modal from '../Modal';
import type { CreationAction, CreationControlProps, CreationStep } from './types';

// The row's Approve or Revoke (M5.8), beside the mark it changes, each asking
// first in a modal: lets a user with no invitation create a
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
    /** The confirming modal's heading, in title case. */
    title: string;
    openClass: string;
    accessibleName: (name: string) => string;
    /** The modal's question, the user's name in bold, on the owner's call. */
    question: (name: string) => ReactNode;
    busy: string;
    confirmClass: string;
    send: (userId: string) => Promise<unknown>;
  }
> = {
  approve: {
    label: 'Approve',
    title: 'Approve Coven Creation',
    // Quiet, the body ink, on the owner's call.
    openClass: 'btn btn--small btn--quiet',
    accessibleName: (name) => `Approve ${name}`,
    question: (name) => (
      <>
        Let <strong>{name}</strong> create covens?
      </>
    ),
    busy: 'Approving',
    confirmClass: 'btn btn--solid',
    send: (userId) => graphqlRequest(GrantWorkspaceCreationDocument, { userId }),
  },
  revoke: {
    label: 'Revoke',
    title: 'Revoke Coven Creation',
    // Red, on the owner's call: it takes something away.
    openClass: 'btn btn--small btn--destructive',
    accessibleName: (name) => `Revoke approval for ${name}`,
    question: (name) => (
      <>
        Stop <strong>{name}</strong> from creating covens? Covens they own stay theirs.
      </>
    ),
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

  // Focus follows the step: to the modal's action when asked, back to the
  // row's on Cancel.
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

  const sending = step === 'sending';
  return (
    <>
      {/* The visible label opens the accessible name, so a voice command
          saying what it sees still reaches it. */}
      <button
        ref={openRef}
        className={copy.openClass}
        type="button"
        aria-label={copy.accessibleName(name)}
        onClick={() => {
          setFailure(undefined);
          setStep('confirming');
        }}
      >
        {copy.label}
      </button>
      {failure && (
        <p className="notice notice--error" role="alert">
          {failure}
        </p>
      )}
      {/* Asks first, in a modal, on the owner's call. A success leaves it open,
          busy, until the refresh replaces this control; a refusal closes it
          and says why in the row. */}
      {step !== 'idle' && (
        <Modal title={copy.title} onClose={cancel}>
          {(close) => (
            <>
              <p>{copy.question(name)}</p>
              <div className="modal__actions">
                <button
                  ref={confirmRef}
                  className={copy.confirmClass}
                  type="button"
                  disabled={sending}
                  aria-busy={sending || undefined}
                  onClick={() => void confirm()}
                >
                  {sending && <span className="spinner" aria-hidden="true" />}
                  {sending ? copy.busy : copy.label}
                </button>
                <button className="btn btn--quiet" type="button" disabled={sending} onClick={close}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
};

export default CreationControl;
