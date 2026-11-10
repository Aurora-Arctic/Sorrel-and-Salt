'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { emailFailure } from '../../lib/email-failure';
import { useFormSend } from '../../lib/use-form-send';
import { reasonProblem } from '../../modules/identity/validation/reason';
import { EmailField, FormActions, RadioGroupField, ReasonField } from '../Field';
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

const NOTE_HINT =
  'Kept with the invitation, and in the record of who changed what once it is accepted.';

/** Lesser role first and chosen to begin with, so granting a role is a choice. */
const SITE_ROLES: readonly InvitableSiteRole[] = ['user', 'curator', 'admin'];

// Accepting a `user` invitation is itself the approval the shared description says a user waits for.
const ACCESS: Record<InvitableSiteRole, string> = {
  ...SITE_ROLE_ACCESS,
  user: 'Creates covens and uses the site through them, with no curator or keeper access.',
};

/** A `user` invitation grants coven creation, not the role, so it is named for that. */
export const invitationRoleLabel = (role: InvitableSiteRole): string =>
  role === 'user' ? 'Coven Creator' : roleLabel(role);

/**
 * The form inside the modal, so its guard over unsaved changes reaches the
 * modal's Close button, Escape and backdrop (claude-docs/components/modal.md,
 * "Unsaved changes").
 */
const InviteFields = ({ onSent, close }: InviteFieldsProps): ReactElement => {
  const [email, setEmail] = useState('');
  const [siteRole, setSiteRole] = useState<InvitableSiteRole>(SITE_ROLES[0]);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string>();
  const { sending, failure, setFailure, send } = useFormSend(['email']);

  const discard = useDiscardGuard(email !== '' || siteRole !== SITE_ROLES[0] || note !== '');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const noteProblem = reasonProblem(note);
    setNoteError(noteProblem);
    const refused = emailFailure(email);
    if (refused) return setFailure(refused);
    if (noteProblem) return;
    const address = email.trim();
    const sent = await send(() =>
      graphqlRequest(CreateAdminInvitationDocument, {
        email: address,
        siteRole,
        note: note.trim() || undefined,
      }),
    );
    if (!sent) return;
    onSent(address);
    close();
  }

  return (
    <form className="form" noValidate onSubmit={(event) => void submit(event)}>
      <p>
        We&apos;ll email them a link that lasts seven days. Only an account that has confirmed this
        address can accept it.
      </p>
      {failure.alert && <Notice kind="error">{failure.alert}</Notice>}
      <EmailField
        name="email"
        value={email}
        error={failure.field?.message}
        disabled={sending}
        // The address is someone else's, so the browser must not offer the signed-in person's own.
        autoComplete="off"
        ignorePasswordManagers
        onChange={(next) => {
          setEmail(next);
          if (failure.field) setFailure({ ...failure, field: undefined });
        }}
      />
      <RadioGroupField
        legend="Role"
        name="invite-site-role"
        options={SITE_ROLES.map((role) => ({
          value: role,
          label: invitationRoleLabel(role),
          description: ACCESS[role],
        }))}
        value={siteRole}
        onChange={setSiteRole}
        disabled={sending}
      />
      <ReasonField
        className="confirmed-action__note"
        hint={NOTE_HINT}
        value={note}
        onChange={(next) => {
          setNote(next);
          setNoteError(undefined);
        }}
        error={noteError}
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

export const INVITE_TITLE = 'New Invitation';

// Rendered whether or not ?invite is open, so a press shows the dialog at once over a skeleton.
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
