import { rolePermits, type WorkspaceRole } from '@/modules/coven';
import { MAKE_IT_OURS_PERMISSION } from '@/modules/ingredients';
import type { CovenAccess } from './types';

type Statement = Parameters<typeof rolePermits>[1];

// Each flag beside the statement its service asserts, so a control is offered only where the save would be accepted.
const ASKS: Record<keyof CovenAccess, Statement> = {
  canUpdateCoven: { workspace: ['update'] },
  canDeleteCoven: { workspace: ['delete'] },
  canReadMembers: { member: ['read'] },
  canReadMemberEmails: { member: ['readEmail'] },
  canInvite: { member: ['invite'] },
  canChangeRoles: { member: ['update'] },
  canRemoveMembers: { member: ['remove'] },
  canPauseMembers: { member: ['pause'] },
  canCreateIngredient: { ingredient: ['create'] },
  canUpdateIngredient: { ingredient: ['update'] },
  canDeleteIngredient: { ingredient: ['delete'] },
  canMakeOurs: MAKE_IT_OURS_PERMISSION,
  canUpdateStock: { inventory: ['update'] },
  canAddToCupboard: { ingredient: ['create'], inventory: ['update'] },
  canCreateSpell: { spell: ['create'] },
  canUpdateSpell: { spell: ['update'] },
  canDeleteSpell: { spell: ['delete'] },
  canCreateWorking: { working: ['create'] },
  canUpdateWorking: { working: ['update'] },
  canDeleteWorking: { working: ['delete'] },
};

export function covenAccessOf(role: WorkspaceRole): CovenAccess {
  return Object.fromEntries(
    Object.entries(ASKS).map(([flag, statement]) => [flag, rolePermits(role, statement)]),
  ) as unknown as CovenAccess;
}
