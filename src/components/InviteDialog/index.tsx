'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { type FormEvent, type ReactElement, useId, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
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

// A steward's Invite: a dialog taking an address and a role, sent as `createInvitation`, which mails
// the link. No link or copy control is drawn, since the browser never holds the token
// (claude-docs/components/invite-dialog.md).

const CreateInvitationDocument = graphql(`
  mutation CreateInvitation($workspaceId: ID!, $email: String!, $role: InvitableRole!) {
    createInvitation(workspaceId: $workspaceId, email: $email, role: $role) {
      id
    }
  }
`);

/** The roles on offer, least first. Steward is not one: the schema's enum has no such value. */
const ROLES: readonly InviteRole[] = ['viewer', 'member'];

const STEWARDSHIP_NOTE =
  'A steward can make them a steward from the members page once they have joined.';

const INVITE_LABEL = 'Invite';
const INVITE_TITLE = 'Invite Someone';

/**
 * The form inside the modal, so its guard over unsaved changes reaches Close, Escape and the backdrop
 * (claude-docs/components/modal.md, "Unsaved changes"). Once sent it shows the confirmation in place of the form.
 */
const InviteFields = ({ workspaceId, close }: InviteFieldsProps): ReactElement => {
  const { refresh } = usePendingNavigation();
  const emailId = useId();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('viewer');
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure>({});
  const [sentTo, setSentTo] = useState<string>();
  const { aria: emailAria, ...emailField } = fieldDescription({
    id: emailId,
    error: failure.field?.message,
  });

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
        note={STEWARDSHIP_NOTE}
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
