import type { InvitableRole } from '@/gql/graphql';

export interface InviteDialogProps {
  workspaceId: string;
}

export interface InviteFieldsProps extends InviteDialogProps {
  close: () => void;
}

/** A role an invitation may grant: never a steward, which the schema's enum cannot name. */
export type InviteRole = InvitableRole;
