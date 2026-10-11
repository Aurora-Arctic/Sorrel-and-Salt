'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactElement, useId, useRef, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import type { Failure } from '../../lib/types';
import BusyButton from '../BusyButton';
import { FieldShell, fieldDescription } from '../Field';
import Modal from '../Modal';
import Notice from '../Notice';

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

/** What the Reason field is for, behind an info tip beside its label (MB.115, on the owner's call). */
const NOTE_HINT =
  'Kept with the invitation, and in the record of who changed what once it is accepted.';

const InviteForm = (): ReactElement => {
  const router = useRouter();
  const emailId = useId();
  const noteId = useId();
  const openRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure>({});
  const [sent, setSent] = useState<string>();
  const { aria: emailAria, ...emailField } = fieldDescription({
    id: emailId,
    error: failure.field?.message,
  });
  const { aria: noteAria, ...noteField } = fieldDescription({ id: noteId, hint: NOTE_HINT });

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
      setFailure(readGraphqlFailure(error, ['email']));
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
        <Notice kind="success" className="admin-invitations__sent">
          Invitation sent to {sent}.
        </Notice>
      )}
      {open && (
        <Modal title="Invite Admin" onClose={cancel}>
          {(close) => (
            <form className="form" noValidate onSubmit={(event) => void submit(event, close)}>
              <p>
                We&apos;ll email them a link that lasts seven days. Only an account that has
                confirmed this address can accept it.
              </p>
              {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
              <FieldShell label="Email Address" required {...emailField}>
                <input
                  id={emailField.controlId}
                  className="input"
                  type="email"
                  autoComplete="off"
                  aria-required
                  {...emailAria}
                  value={email}
                  disabled={sending}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </FieldShell>
              {/* The wrapper holds the field's room above and below, as the
                  confirmation's Reason has; the shell takes no class. */}
              <div className="admin-invitations__note">
                <FieldShell label="Reason" hint={NOTE_HINT} {...noteField}>
                  <input
                    id={noteField.controlId}
                    className="input"
                    type="text"
                    autoComplete="off"
                    {...noteAria}
                    value={note}
                    disabled={sending}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </FieldShell>
              </div>
              <div className="modal__actions">
                <BusyButton
                  className="btn btn--solid"
                  type="submit"
                  disabled={sending || email.trim() === ''}
                  busy={sending}
                  busyLabel="Sending"
                >
                  Send Invitation
                </BusyButton>
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
