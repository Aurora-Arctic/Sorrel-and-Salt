import type { InvitableRole } from '@/gql/graphql';

export interface InviteDialogProps {
  /** The coven invited into. The page shows the dialog to an owner only; the service is the guard. */
  workspaceId: string;
}

/** The form inside the modal, given the modal's own close. */
export interface InviteFieldsProps extends InviteDialogProps {
  /** The modal's close, unguarded: a sent invitation goes at once. */
  close: () => void;
}

/** A role an invitation may grant: never an owner, which the schema's enum cannot name. */
export type InviteRole = InvitableRole;
