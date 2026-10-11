'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import type { Failure } from '../../lib/types';
import BusyButton from '../BusyButton';
import { FieldShell, fieldDescription } from '../Field';
import { RouteModal } from '../Modal';
import Notice from '../Notice';
import { INVITATIONS_HREF } from './href';
import type { InviteFormProps } from './types';

// The modal Invite Admin opens, by the tab's address, `?invite`, as a value
// page's `?new` opens its own (MB.115: Invite Admin moved beside the page's
// heading, out of this component's reach): an address and an optional
// reason, sent as `createAdminInvitation`, which mails the link and answers
// no link (MB.70). Closing goes back to the tab and re-reads it, so the new
// invitation is listed. The service is the guard; a refused address is said
// beside the field (claude-docs/components/admin-invitations.md).

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

const InviteForm = ({ onSent }: InviteFormProps): ReactElement => {
  const emailId = useId();
  const noteId = useId();
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure>({});
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
      onSent(address);
      close();
    } catch (error) {
      setSending(false);
      setFailure(readGraphqlFailure(error, ['email']));
    }
  }

  return (
    <RouteModal title="Invite Admin" closeHref={INVITATIONS_HREF}>
      {(close) => (
        <form className="form" noValidate onSubmit={(event) => void submit(event, close)}>
          <p>
            We&apos;ll email them a link that lasts seven days. Only an account that has confirmed
            this address can accept it.
          </p>
          {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
          <FieldShell label="Email Address" required {...emailField}>
            <input
              id={emailField.controlId}
              className="input"
              type="email"
              autoComplete="off"
              placeholder="Add an email"
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
                placeholder="Add a reason"
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
    </RouteModal>
  );
};

export default InviteForm;
