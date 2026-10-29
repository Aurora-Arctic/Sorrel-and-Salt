'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { normaliseEmail, validateEmailAddress } from '../../lib/email-address';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import type { Failure } from '../../lib/types';
import { FieldShell, FormActions, RadioGroupField, fieldDescription } from '../Field';
import { WORKSPACE_ROLE_ACCESS } from '../MemberList/role-access';
import { DiscardQuestion, ModalButton, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { workspaceRoleLabel } from '../UserDetail/roles';
import type { InviteFieldsProps, InviteDialogProps, InviteRole } from './types';

// An owner's Invite, on the members page: a `ModalButton` that opens a dialog taking an
// address and a role, sent as `createInvitation`, which mails the link and answers no link.
// The dialog then says where the mail went. No copy control and no link is ever drawn,
// since the browser never holds one: the token exists only in the mail. The service is the
// guard; a refused address is said beside the field (claude-docs/components/invite-dialog.md).

const CreateInvitationDocument = graphql(`
  mutation CreateInvitation($workspaceId: ID!, $email: String!, $role: InvitableRole!) {
    createInvitation(workspaceId: $workspaceId, email: $email, role: $role) {
      id
    }
  }
`);

/** The roles on offer, least first. Owner is not one: the schema's enum has no such value. */
const ROLES: readonly InviteRole[] = ['viewer', 'member'];

/** What holds whichever role is chosen, read with the group. */
const OWNERSHIP_NOTE =
  'An owner can make them an owner from the members page once they have joined.';

/** The button, and the modal's head. */
const INVITE_LABEL = 'Invite';
const INVITE_TITLE = 'Invite Someone';

/**
 * The form inside the modal, so its guard over unsaved changes reaches the
 * modal's Close button, Escape and backdrop (claude-docs/components/modal.md,
 * "Unsaved changes"). Once the invitation is sent it shows the confirmation in
 * place of the form, so the same invitation cannot be sent twice from here.
 */
const InviteFields = ({ workspaceId, close }: InviteFieldsProps): ReactElement => {
  const { refresh } = usePendingNavigation();
  const emailId = useId();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('viewer');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure>({});
  // The address the mail went to, once it has: what the confirmation names.
  const [sentTo, setSentTo] = useState<string>();
  const { aria: emailAria, ...emailField } = fieldDescription({
    id: emailId,
    error: failure.field?.message,
  });

  // Anything typed is a change: Cancel, and every other way out, asks first
  // (as the admin invitation form does); a sent invitation does not.
  const discard = useDiscardGuard(sentTo === undefined && email !== '');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    // The same rule the service applies, said before anything is sent.
    const issue = validateEmailAddress(normaliseEmail(address));
    if (issue) return setFailure({ field: { name: 'email', message: issue.message } });

    setSending(true);
    setFailure({});
    try {
      await graphqlRequest(CreateInvitationDocument, { workspaceId, email: address, role });
      setSending(false);
      setSentTo(address);
      // The pending list behind the dialog reads again, so the new invitation is on it.
      refresh();
    } catch (error) {
      setSending(false);
      setFailure(readGraphqlFailure(error, ['email']));
    }
  }

  if (sentTo !== undefined) {
    return (
      <div className="form">
        <Notice kind="success">
          Invitation sent to <strong>{sentTo}</strong>. The link in it lasts seven days, and only an
          account that has confirmed this address can accept it.
        </Notice>
        <div className="modal__actions">
          <button className="btn btn--solid" type="button" onClick={close}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="form" noValidate onSubmit={(event) => void submit(event)}>
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
          onChange={(event) => {
            setEmail(event.target.value);
            // The refusal was of what was typed, which has changed.
            if (failure.field) setFailure({});
          }}
        />
      </FieldShell>
      <RadioGroupField
        legend="Role"
        name="invite-role"
        options={ROLES.map((value) => ({
          value,
          label: workspaceRoleLabel(value),
          description: WORKSPACE_ROLE_ACCESS[value],
        }))}
        value={role}
        onChange={setRole}
        disabled={sending}
        note={OWNERSHIP_NOTE}
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

const InviteDialog = ({ workspaceId }: InviteDialogProps): ReactElement => (
  <ModalButton label={INVITE_LABEL} className="btn btn--solid" title={INVITE_TITLE}>
    {(close) => <InviteFields workspaceId={workspaceId} close={close} />}
  </ModalButton>
);

export default InviteDialog;
