'use client';

import { ClientError } from 'graphql-request';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactElement, useId, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import Modal from '../Modal';
import type { InviteFailure } from './types';

// Invite Admin, and the modal it opens: an address and an optional reason,
// sent as `createAdminInvitation`, which mails the link and answers no link
// (MB.70). The service is the guard; a refused address is said beside the
// field (claude-docs/components/admin-invitations.md).

const CreateAdminInvitationDocument = graphql(`
  mutation CreateAdminInvitation($email: String!, $note: String) {
    createAdminInvitation(email: $email, note: $note) {
      id
    }
  }
`);

const GENERIC_ERROR = "That didn't work. Please try again.";

// The shape claude-docs/graphql/errors.md, "Errors" describes.
function failureOf(error: unknown): InviteFailure {
  if (!(error instanceof ClientError)) return { alert: GENERIC_ERROR };
  const first = error.response.errors?.[0];
  const extensions = first?.extensions as
    { code?: string; fieldErrors?: { path: (string | number)[]; message: string }[] } | undefined;
  const issue = extensions?.fieldErrors?.find(({ path }) => path[0] === 'email');
  if (extensions?.code === 'VALIDATION' && issue) return { field: issue.message };
  return { alert: first?.message || GENERIC_ERROR };
}

const InviteForm = (): ReactElement => {
  const router = useRouter();
  const emailId = useId();
  const emailErrorId = useId();
  const noteId = useId();
  const noteHintId = useId();
  const openRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<InviteFailure>({});
  const [sent, setSent] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>, close: () => void) {
    event.preventDefault();
    const address = email.trim();
    setSending(true);
    setFailure({});
    try {
      await graphqlRequest(CreateAdminInvitationDocument, {
        email: address,
        note: note.trim() || undefined,
      });
      setSending(false);
      setSent(address);
      close();
      router.refresh();
    } catch (error) {
      setSending(false);
      setFailure(failureOf(error));
    }
  }

  function cancel() {
    setOpen(false);
    openRef.current?.focus();
  }

  return (
    <>
      <button
        ref={openRef}
        className="btn btn--solid"
        type="button"
        onClick={() => {
          setEmail('');
          setNote('');
          setFailure({});
          setSent(undefined);
          setOpen(true);
        }}
      >
        Invite Admin
      </button>
      {sent && (
        <output className="notice notice--success admin-invitations__sent">
          Invitation sent to {sent}.
        </output>
      )}
      {open && (
        <Modal title="Invite an Admin" onClose={cancel}>
          {(close) => (
            <form className="form" noValidate onSubmit={(event) => void submit(event, close)}>
              <p>
                We&apos;ll email them a link that lasts seven days. Only an account that has
                confirmed this address can accept it.
              </p>
              {failure.alert && (
                <p className="notice notice--error" role="alert">
                  {failure.alert}
                </p>
              )}
              <div className="field">
                <label className="field__label" htmlFor={emailId}>
                  Email Address
                  <span className="admin-invitations__required" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id={emailId}
                  className="input"
                  type="email"
                  autoComplete="off"
                  aria-required
                  aria-invalid={failure.field ? true : undefined}
                  aria-describedby={failure.field ? emailErrorId : undefined}
                  value={email}
                  disabled={sending}
                  onChange={(event) => setEmail(event.target.value)}
                />
                {failure.field && (
                  <p id={emailErrorId} className="field__error">
                    {failure.field}
                  </p>
                )}
              </div>
              <div className="field admin-invitations__note">
                <label className="field__label" htmlFor={noteId}>
                  Reason
                </label>
                <p id={noteHintId} className="field__hint">
                  Kept with the invitation, and in the record of who changed what once it is
                  accepted.
                </p>
                <input
                  id={noteId}
                  className="input"
                  type="text"
                  autoComplete="off"
                  aria-describedby={noteHintId}
                  value={note}
                  disabled={sending}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
              <div className="modal__actions">
                <button
                  className="btn btn--solid"
                  type="submit"
                  disabled={sending || email.trim() === ''}
                  aria-busy={sending || undefined}
                >
                  {sending && <span className="spinner" aria-hidden="true" />}
                  {sending ? 'Sending' : 'Send Invitation'}
                </button>
                <button className="btn btn--quiet" type="button" disabled={sending} onClick={close}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
};

export default InviteForm;
