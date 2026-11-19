'use client';

import { useAnnounce } from '../ClickFeedback/status-region';
import { usePendingNavigation } from '../../lib/navigation';
import { type FormEvent, type ReactElement, useEffect, useRef, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { emailFailure } from '../../lib/email-failure';
import { graphqlRequest } from '../../lib/graphql-client';
import { useFormSend } from '../../lib/use-form-send';
import { useResultFocus } from '../../lib/use-result-focus';
import { EmailField, FormActions, RadioGroupField } from '../Field';
import { WORKSPACE_ROLE_ACCESS, workspaceRoleLabel } from '../MemberList/roles';
import { DiscardQuestion, ModalButton, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
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

const STEWARDSHIP_NOTE = 'A Steward can promote them once they join.';

const INVITE_LABEL = 'Invite';
const INVITE_TITLE = 'Invite Someone';

/**
 * The form inside the modal, so its guard over unsaved changes reaches Close, Escape and the backdrop
 * (claude-docs/components/modal.md, "Unsaved changes"). Once sent it shows the confirmation in place of the form.
 */
const InviteFields = ({ workspaceId, close }: InviteFieldsProps): ReactElement => {
  const { refresh } = usePendingNavigation();
  const announce = useAnnounce();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('viewer');
  const { sending, failure, setFailure, send } = useFormSend(['email']);
  const { ref, settle } = useResultFocus<HTMLFormElement>();
  const [sentTo, setSentTo] = useState<string>();
  const done = useRef<HTMLButtonElement>(null);
  // Send Invitation held the focus and is gone, so the focus goes to Done, which takes its place.
  useEffect(() => {
    if (sentTo !== undefined) done.current?.focus();
  }, [sentTo]);

  const discard = useDiscardGuard(sentTo === undefined && email !== '');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const refused = emailFailure(email);
    if (refused) {
      setFailure(refused);
      return settle();
    }
    const address = email.trim();

    const sent = await send(() =>
      graphqlRequest(CreateInvitationDocument, { workspaceId, email: address, role }),
    );
    if (!sent) return settle();
    setSentTo(address);
    announce('Invitation sent');
    // The pending list behind the dialog reads again, so the new invitation is on it.
    refresh();
  }

  return (
    <>
      {sentTo !== undefined && (
        // The dialog's status region says it; the notice itself carries no role, so it is heard once.
        <Notice kind="success" block inRegion>
          Invitation sent to <strong>{sentTo}</strong>. The link in it lasts seven days, and only an
          account that has confirmed this address can accept it.
        </Notice>
      )}
      {sentTo !== undefined ? (
        <div className="modal__actions">
          <button ref={done} className="btn btn--solid" type="button" onClick={close}>
            Done
          </button>
        </div>
      ) : (
        <form className="form" noValidate ref={ref} onSubmit={(event) => void submit(event)}>
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
              if (failure.field) setFailure({});
            }}
          />
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
      )}
    </>
  );
};

const InviteDialog = ({ workspaceId }: InviteDialogProps): ReactElement => (
  <ModalButton label={INVITE_LABEL} className="btn btn--solid" title={INVITE_TITLE}>
    {(close) => <InviteFields workspaceId={workspaceId} close={close} />}
  </ModalButton>
);

export default InviteDialog;
