import 'server-only';
import { createAccessControl } from 'better-auth/plugins/access';
import type { RoleAuthorizeRequest } from 'better-auth/plugins/access';
import type { WorkspaceRole } from '../types';

// The site role is not read here, as a keeper reaches no workspace. Permission statements rather than a rank comparison, so a role off the
// observer < practitioner < steward line cannot make an "at least member" check mean something nobody checked
// (claude-docs/design-decisions/m6.3-permission-statements.md).

const statements = {
  /** Never the compendium, which is curated by site role. */
  ingredient: ['read', 'create', 'update', 'delete'],
  /** No `create` or `delete`: adding and throwing out a jar are writes like any change, so all three check `update`. */
  inventory: ['read', 'update'],
  spell: ['read', 'create', 'update', 'delete'],
  /** Its own resource so a role can be given one and not the other. */
  working: ['read', 'create', 'update', 'delete'],
  /** `readEmail` is its own action since a member reads the roll but only a steward needs it to tell two people apart. */
  member: ['read', 'readEmail', 'invite', 'update', 'remove', 'pause'],
  workspace: ['read', 'update', 'delete'],
} as const;

const ac = createAccessControl(statements);

const viewer = ac.newRole({
  ingredient: ['read'],
  inventory: ['read'],
  spell: ['read'],
  working: ['read'],
  workspace: ['read'],
});

const member = ac.newRole({
  ingredient: ['read', 'create', 'update', 'delete'],
  inventory: ['read', 'update'],
  member: ['read'],
  spell: ['read', 'create', 'update', 'delete'],
  working: ['read', 'create', 'update', 'delete'],
  workspace: ['read'],
});

const owner = ac.newRole({
  ingredient: ['read', 'create', 'update', 'delete'],
  inventory: ['read', 'update'],
  spell: ['read', 'create', 'update', 'delete'],
  working: ['read', 'create', 'update', 'delete'],
  member: ['read', 'readEmail', 'invite', 'update', 'remove', 'pause'],
  workspace: ['read', 'update', 'delete'],
});

// A fourth `workspace_role` value fails to compile here until someone says what it may do; that must not be decided by omission.
const ROLE_ABILITIES: Record<WorkspaceRole, ReturnType<typeof ac.newRole>> = {
  viewer,
  member,
  owner,
};

/** An undeclared resource or action is a compile error. */
export type WorkspacePermission = RoleAuthorizeRequest<typeof statements>;

export const WORKSPACE_STATEMENTS = statements;

/** Several resources in one request are ANDed. */
export function rolePermits(role: WorkspaceRole, permission: WorkspacePermission): boolean {
  return ROLE_ABILITIES[role].authorize(permission).success;
}
