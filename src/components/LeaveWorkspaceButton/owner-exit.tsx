'use client';

import { useRouter } from 'next/navigation';
import { type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { ComboboxTypeahead } from '../Combobox/typeahead';
import DeleteWorkspaceButton from '../DeleteWorkspaceButton';
import { RadioGroupField, Required } from '../Field';
import { WORKSPACE_ROLE_ACCESS } from '../MemberList/role-access';
import Modal from '../Modal';
import Notice from '../Notice';
import { workspaceRoleLabel } from '../UserDetail/roles';
import ActionFailure, { useActionFailure } from '../WorkspaceActions/action-failure';
import { LeaveWorkspaceDocument } from './documents';
import type { OwnerExitProps, WayOut } from './types';

// The only owner's Leave (M6.16). The last-owner guard (M6.8) would refuse
// them, so the button explains instead of refusing: it opens a dialog asking
// what happens to the coven, handing it to someone or deleting it, the way
// Change Role asks which role (the owner's call at the design review). The
// button stays enabled so nobody concludes they are stuck. Promote-then-leave
// is two requests in this order on purpose: if the leave fails after the
// promotion, the coven has two owners, never none. The service is still the
// guard (claude-docs/components/leave-workspace-button.md).

const PromoteSuccessorDocument = graphql(`
  mutation PromoteSuccessor($workspaceId: ID!, $userId: ID!, $role: WorkspaceRole!) {
    updateMemberRole(workspaceId: $workspaceId, userId: $userId, role: $role) {
      role
    }
  }
`);

const OwnerExit = ({ workspaceId, name, successors }: OwnerExitProps): ReactElement => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="btn"
        type="button"
        aria-label="Leave Workspace"
        onClick={() => setOpen(true)}
      >
        Leave Workspace
      </button>
      {open && (
        <Modal title="Leave Workspace" onClose={() => setOpen(false)}>
          {(close) => (
            // Its own failure place, so a refusal shows in the dialog rather
            // than on the page behind it.
            <ActionFailure>
              {successors.length === 0 ? (
                <SoleMember workspaceId={workspaceId} name={name} onCancel={close} />
              ) : (
                <Options
                  workspaceId={workspaceId}
                  name={name}
                  successors={successors}
                  onCancel={close}
                />
              )}
            </ActionFailure>
          )}
        </Modal>
      )}
    </>
  );
};

/** Nobody else is in the coven, so deleting it is the whole answer. */
const SoleMember = ({
  workspaceId,
  name,
  onCancel,
}: Pick<OwnerExitProps, 'workspaceId' | 'name'> & { onCancel: () => void }): ReactElement => (
  <>
    <p>
      Leave <strong>{name}</strong>? You are its only member, so leaving would leave it with no one.
      Deleting it is the way out.
    </p>
    <Notice kind="warn" quiet>
      Nothing is destroyed, but only an administrator with database access can restore it.
    </Notice>
    <div className="modal__actions">
      <DeleteWorkspaceButton workspaceId={workspaceId} name={name} inModal onlyOwner />
      <button className="btn btn--quiet" type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  </>
);

const Options = ({
  workspaceId,
  name,
  successors,
  onCancel,
}: OwnerExitProps & { onCancel: () => void }): ReactElement => {
  const router = useRouter();
  const failure = useActionFailure();
  const id = useId();
  // One other member is offered by name, with nothing to search (the owner's
  // call); more than one are searched by name.
  const only = successors.length === 1 ? successors[0] : undefined;
  const [way, setWay] = useState<WayOut>('hand');
  const [picked, setPicked] = useState(only?.userId ?? '');
  const [sending, setSending] = useState(false);

  async function handOverAndLeave() {
    if (!picked) return;
    setSending(true);
    failure?.report(undefined);
    const successor = successors.find(({ userId }) => userId === picked);
    try {
      await graphqlRequest(PromoteSuccessorDocument, {
        workspaceId,
        userId: picked,
        role: 'owner',
      });
    } catch (error) {
      setSending(false);
      failure?.report(readGraphqlFailure(error).alert);
      return;
    }
    try {
      await graphqlRequest(LeaveWorkspaceDocument, { workspaceId });
    } catch (error) {
      setSending(false);
      // Said plainly: the first half happened and stands.
      failure?.report(
        `${successor?.name ?? 'They'} is now an owner, but you did not leave. ${readGraphqlFailure(error).alert}`,
      );
      return;
    }
    // The coven is closed to this user now, so the page cannot be read again.
    router.replace('/');
  }

  return (
    <>
      <p>
        Leave <strong>{name}</strong>? It needs an owner, so choose what happens to it.
      </p>
      <RadioGroupField
        legend="What Happens to the Coven?"
        name={`${id}-way`}
        options={[
          {
            value: 'hand',
            label: only ? `Hand it to ${only.name}` : 'Hand it to another member',
            description: 'They become an owner first, then you leave.',
          },
          {
            value: 'delete',
            label: 'Delete it',
            description:
              'Closes it for every other member as well. Only an administrator can restore it.',
          },
        ]}
        value={way}
        // Held still while the hand-over is out, without redrawing as disabled.
        onChange={(next) => !sending && setWay(next)}
      />
      {way === 'hand' && !only && (
        <div className="field">
          <label className="field__label" htmlFor={`${id}-owner`}>
            New Owner
            <Required />
          </label>
          <ComboboxTypeahead
            id={`${id}-owner`}
            label="New Owner"
            required
            value={picked}
            onChange={(userId) => !sending && setPicked(userId)}
            placeholder="Search Members"
            // Each with their role now, as a form's row shows its group:
            // "Fixture B (Member)", and what that role may do in the tooltip.
            choices={successors.map(({ userId, name: member, role }) => ({
              value: userId,
              label: member,
              qualifier: { text: workspaceRoleLabel(role), detail: WORKSPACE_ROLE_ACCESS[role] },
            }))}
          />
        </div>
      )}
      <div className="modal__actions">
        {way === 'hand' ? (
          <BusyButton
            className="btn btn--solid"
            disabled={sending || !picked}
            busy={sending}
            busyLabel="Handing Over"
            onClick={() => void handOverAndLeave()}
          >
            Promote and Leave
          </BusyButton>
        ) : (
          // The confirm for this choice: it asks M6.14's question over the
          // dialog, and nothing is deleted from the dialog itself.
          <DeleteWorkspaceButton workspaceId={workspaceId} name={name} inModal onlyOwner />
        )}
        <button className="btn btn--quiet" type="button" disabled={sending} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </>
  );
};

export default OwnerExit;
