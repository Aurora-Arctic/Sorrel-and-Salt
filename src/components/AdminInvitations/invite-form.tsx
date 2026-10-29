'use client';

import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import type { Failure } from '../../lib/types';
import { FieldShell, FormActions, RadioGroupField, ReasonField, fieldDescription } from '../Field';
import { DiscardQuestion, RouteModal, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { roleLabel, SITE_ROLE_ACCESS } from '../UserList/roles';
import type { InvitableSiteRole, InviteFieldsProps, InviteFormProps } from './types';

// The modal New Invitation opens at `?invite`: an address, the site role and an optional reason, sent as
// `createAdminInvitation`, which mails the link and answers none. Closing re-reads the tab so the new invitation
// is listed. The service is the guard; a refused address is said beside the field (claude-docs/components/admin-invitations.md).

const CreateAdminInvitationDocument = graphql(`
  mutation CreateAdminInvitation($email: String!, $siteRole: InvitableSiteRole!, $note: String) {
    createAdminInvitation(email: $email, siteRole: $siteRole, note: $note) {
      id
    }
  }
`);

/**
 * Where the Reason is kept, behind its info tip: with the invitation first,
 * where a confirmed change's is kept with the change.
 */
const NOTE_HINT =
  'Kept with the invitation, and in the record of who changed what once it is accepted.';

/**
 * The roles an invitation offers, the lesser first and chosen to begin with, so
 * granting the people page is a choice the admin makes.
 */
const SITE_ROLES: readonly InvitableSiteRole[] = ['curator', 'admin'];

/**
 * The form inside the modal, so its guard over unsaved changes reaches the
 * modal's Close button, Escape and backdrop (claude-docs/components/modal.md,
 * "Unsaved changes").
 */
const InviteFields = ({ onSent, close }: InviteFieldsProps): ReactElement => {
  const emailId = useId();

  const [email, setEmail] = useState('');
  const [siteRole, setSiteRole] = useState<InvitableSiteRole>(SITE_ROLES[0]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure>({});
  const { aria: emailAria, ...emailField } = fieldDescription({
    id: emailId,
    error: failure.field?.message,
  });

  // Anything typed is a change: Cancel, and every other way out, asks first; a sent
  // invitation does not.
  const discard = useDiscardGuard(email !== '' || siteRole !== SITE_ROLES[0] || note !== '');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    setSending(true);
    setFailure({});
    try {
      await graphqlRequest(CreateAdminInvitationDocument, {
        email: address,
        siteRole,
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
      <RadioGroupField
        legend="Role"
        name="invite-site-role"
        options={SITE_ROLES.map((role) => ({
          value: role,
          label: roleLabel(role),
          description: SITE_ROLE_ACCESS[role],
        }))}
        value={siteRole}
        onChange={setSiteRole}
        disabled={sending}
      />
      <ReasonField
        className="user-list__note"
        hint={NOTE_HINT}
        value={note}
        onChange={setNote}
        disabled={sending}
      />
      <FormActions
        noun="Invitation"
        label="Send Invitation"
        busyLabel="Sending"
        dirty={email.trim() !== ''}
        submitting={sending}
        holdCancel
        onCancel={() => discard.request(close)}
      />
      {/* Over the form, its buttons beneath. */}
      {discard.asking && <DiscardQuestion guard={discard} />}
    </form>
  );
};

/** The modal's head, and the tab's action that opens it. */
export const INVITE_TITLE = 'New Invitation';

// The tab's one modal place, rendered whether or not `?invite` is open, so New
// Invitation's press shows it at once over a skeleton and the form arrives in the
// same dialog.
const InviteForm = ({ open, onSent, closeHref }: InviteFormProps): ReactElement => (
  <RouteModal
    closeHref={closeHref}
    content={
      open
        ? {
            heading: { title: INVITE_TITLE },
            body: (close) => <InviteFields onSent={onSent} close={close} />,
          }
        : undefined
    }
  />
);

export default InviteForm;
