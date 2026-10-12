'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import type { Failure } from '../../lib/types';
import BusyButton from '../BusyButton';
import { FieldShell, ReasonField, fieldDescription } from '../Field';
import { DiscardQuestion, RouteModal, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import type { InviteFieldsProps, InviteFormProps } from './types';

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

/**
 * Where the Reason is kept, behind its info tip (MB.115, on the owner's
 * call): with the invitation first, where a confirmed change's is kept with
 * the change.
 */
const NOTE_HINT =
  'Kept with the invitation, and in the record of who changed what once it is accepted.';

/**
 * The form inside the modal, so its guard over unsaved changes reaches the
 * modal's Close button, Escape and backdrop (claude-docs/components/modal.md,
 * "Unsaved changes").
 */
const InviteFields = ({ onSent, close }: InviteFieldsProps): ReactElement => {
  const emailId = useId();

  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure>({});
  const { aria: emailAria, ...emailField } = fieldDescription({
    id: emailId,
    error: failure.field?.message,
  });

  // Anything typed is a change: Cancel, and every other way out, asks first
  // (MB.115, the owner's call); a sent invitation does not.
  const discard = useDiscardGuard(email !== '' || note !== '');

  async function submit(event: FormEvent<HTMLFormElement>) {
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
    <form className="form" noValidate onSubmit={(event) => void submit(event)}>
      <p>
        We&apos;ll email them a link that lasts seven days. Only an account that has confirmed this
        address can accept it.
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
      <ReasonField
        className="user-list__note"
        hint={NOTE_HINT}
        value={note}
        onChange={setNote}
        disabled={sending}
      />
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
        <button
          className="btn btn--quiet"
          type="button"
          disabled={sending}
          onClick={() => discard.request(close)}
        >
          Cancel
        </button>
      </div>
      {/* Over the form, its buttons beneath (MB.115). */}
      {discard.asking && <DiscardQuestion guard={discard} />}
    </form>
  );
};

const InviteForm = ({ onSent, closeHref }: InviteFormProps): ReactElement => (
  <RouteModal title="Invite Admin" closeHref={closeHref}>
    {(close) => <InviteFields onSent={onSent} close={close} />}
  </RouteModal>
);

export default InviteForm;
