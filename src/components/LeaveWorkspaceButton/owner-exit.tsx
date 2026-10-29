'use client';

import { usePendingNavigation } from '../../lib/navigation';
import { type ReactElement, useId, useState } from 'react';
import { graphql } from '../../gql';
import { COVEN_LANDING_PATH } from '../../lib/coven-path';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { ComboboxTypeahead } from '../Combobox/typeahead';
import DeleteWorkspaceButton from '../DeleteWorkspaceButton';
import { FieldShell, fieldDescription, RadioGroupField } from '../Field';
import { WORKSPACE_ROLE_ACCESS } from '../MemberList/role-access';
import { ModalButton } from '../Modal';
import Notice from '../Notice';
import { workspaceRoleLabel } from '../UserDetail/roles';
import { LeaveWorkspaceDocument } from './documents';
import type { OwnerExitProps, WayOut } from './types';

// The only owner's Leave: a dialog asking whether to hand the coven over or delete it.
// Promote-then-leave is two requests in that order so a failed leave leaves two owners, never none
// (claude-docs/components/leave-workspace-button.md).

const PromoteSuccessorDocument = graphql(`
  mutation PromoteSuccessor($workspaceId: ID!, $userId: ID!, $role: WorkspaceRole!) {
    updateMemberRole(workspaceId: $workspaceId, userId: $userId, role: $role) {
      role
    }
  }
`);

const OwnerExit = ({ workspaceId, name, successors }: OwnerExitProps): ReactElement => (
  // The button is always enabled, so nobody concludes they are stuck, and
  // ModalButton takes the focus back to it however the dialog closes.
  <ModalButton label="Leave Coven" className="btn" title="Leave Coven">
    {(close) => (
      <ExitDialog workspaceId={workspaceId} name={name} successors={successors} onCancel={close} />
    )}
  </ModalButton>
);

type Report = (message: string | undefined) => void;

/**
 * The dialog's body. Promote and Leave's refusal is a plain notice at its top, not a callout
 * over the dialog; Delete says its own on a line above the buttons. Its own component, so the
 * refusal goes when the dialog closes.
 */
const ExitDialog = ({
  workspaceId,
  name,
  successors,
  onCancel,
}: OwnerExitProps & { onCancel: () => void }): ReactElement => {
  const [failure, setFailure] = useState<string>();
  return (
    <>
      {failure && <Notice kind="error">{failure}</Notice>}
      {successors.length === 0 ? (
        <SoleMember workspaceId={workspaceId} name={name} onCancel={onCancel} />
      ) : (
        <Options
          workspaceId={workspaceId}
          name={name}
          successors={successors}
          onCancel={onCancel}
          report={setFailure}
        />
      )}
    </>
  );
};

/** Nobody else is in the coven, so deleting it is the whole answer. */
const SoleMember = ({
  workspaceId,
  name,
  onCancel,
}: Pick<OwnerExitProps, 'workspaceId' | 'name'> & {
  onCancel: () => void;
}): ReactElement => (
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
  report,
}: OwnerExitProps & { onCancel: () => void; report: Report }): ReactElement => {
  const { navigate, refresh } = usePendingNavigation();
  const id = useId();
  const ownerField = fieldDescription({ id: `${id}-owner` });
  // One other member is offered by name, with nothing to search; more than one are searched
  // by name.
  const only = successors.length === 1 ? successors[0] : undefined;
  const [way, setWay] = useState<WayOut>('hand');
  const [picked, setPicked] = useState(only?.userId ?? '');
  const [sending, setSending] = useState(false);

  async function handOverAndLeave() {
    if (!picked) return;
    setSending(true);
    report(undefined);
    const successor = successors.find(({ userId }) => userId === picked);
    try {
      await graphqlRequest(PromoteSuccessorDocument, {
        workspaceId,
        userId: picked,
        role: 'owner',
      });
    } catch (error) {
      setSending(false);
      report(readGraphqlFailure(error).alert);
      return;
    }
    try {
      await graphqlRequest(LeaveWorkspaceDocument, { workspaceId });
    } catch (error) {
      setSending(false);
      // Said plainly: the first half happened and stands.
      report(
        `${successor?.name ?? 'They'} is now an owner, but you did not leave. ${readGraphqlFailure(error).alert}`,
      );
      return;
    }
    // The coven is closed to this user now, so the page cannot be read again;
    // the refresh brings the switcher's new list in, as Leave's does.
    navigate(COVEN_LANDING_PATH, { replace: true });
    refresh();
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
            label: only ? `Hand It to ${only.name}` : 'Hand It to Another Member',
            description: 'They become an owner first, then you leave.',
          },
          {
            value: 'delete',
            label: 'Delete It',
            description:
              'Closes it for every other member as well. Only an administrator with database access can restore it.',
          },
        ]}
        value={way}
        // Held still while the hand-over is out, without redrawing as disabled.
        onChange={(next) => !sending && setWay(next)}
      />
      {way === 'hand' && !only && (
        <FieldShell label="New Owner" required {...ownerField}>
          <ComboboxTypeahead
            id={ownerField.controlId}
            label="New Owner"
            labelId={ownerField.labelId}
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
        </FieldShell>
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
          // The confirm for this choice: it asks the delete-coven question over the
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
